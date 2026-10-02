import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { getSchoolClass } from '@/lib/school-classes'
import { parseCustomerContact, upsertCustomerByEmail } from '@/lib/public-customer'

/**
 * スクールの申込行（status: pending）を作る。申込フォームの送信で最初に呼ばれる。
 * この後 /api/create-school-checkout-session が決済画面を作り、決済完了は Webhook が反映する。
 *
 * ⚠ クラス名・月謝・入会金はブラウザから受け取らず、lib/school-classes.ts から決める。
 * ⚠ 返すのは申込の id だけ。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 10 * 60 * 1000
const MAX_ENROLLMENTS = 10

const TEXT_MAX = 200
const ADDRESS_MAX = 500
const NOTES_MAX = 2000

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`create-school-enrollment:${ip}`, { windowMs: WINDOW_MS, max: MAX_ENROLLMENTS })) {
    return NextResponse.json({ error: '短時間に送信が多すぎます。しばらくしてからお試しください。' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return bad('リクエストの形式が不正です')
    body = parsed as Record<string, unknown>
  } catch {
    return bad('リクエストの形式が不正です')
  }

  const studentType = body.student_type === 'adult' ? 'adult' : body.student_type === 'child' ? 'child' : null
  if (!studentType) return bad('受講者の区分が正しくありません')
  const isAdult = studentType === 'adult'

  const studentName = text(body.student_name, TEXT_MAX)
  if (!studentName) return bad('受講者のお名前を入力してください')

  const studentAge = Number(body.student_age)
  if (!Number.isInteger(studentAge) || studentAge < 1 || studentAge > 150) {
    return bad('年齢を正しく入力してください')
  }

  // 大人は本人が契約者。子どもの場合は保護者が契約者になる
  const contact = parseCustomerContact(
    { name: isAdult ? studentName : body.parent_name, email: body.email, phone: body.phone },
    { phoneRequired: true },
  )
  if (!contact.ok) return bad(contact.error)

  const address = text(body.address, ADDRESS_MAX)
  const selectedClass = getSchoolClass(typeof body.class_type === 'string' ? body.class_type : null)

  const customer = await upsertCustomerByEmail(supabaseAdmin, contact.value, {
    // 住所は入力があったときだけ更新する（空欄で既存の住所を消さない）
    ...(address ? { address } : {}),
  })
  if (!customer) return NextResponse.json({ error: '申込の保存に失敗しました' }, { status: 500 })

  const { data: enrollment, error } = await supabaseAdmin
    .from('school_enrollments')
    .insert({
      customer_id: customer.id,
      class_type: selectedClass.id,
      class_name: selectedClass.name,
      student_type: studentType,
      student_name: studentName,
      student_age: studentAge,
      student_grade: isAdult ? null : text(body.student_grade, TEXT_MAX),
      monthly_fee: selectedClass.price,
      registration_fee: selectedClass.registrationFee,
      // 入会金 + 初月月謝
      total_amount: selectedClass.registrationFee + selectedClass.price,
      notes: text(body.notes, NOTES_MAX),
      status: 'pending',
      payment_status: 'pending',
      enrollment_date: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !enrollment) {
    console.error('[create-school-enrollment] insert failed:', error?.code, error?.message)
    return NextResponse.json({ error: '申込の保存に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ enrollment_id: enrollment.id }, { status: 201 })
}
