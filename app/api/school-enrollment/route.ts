import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * スクール申込の完了画面（/school/success）に出す内容を返す。
 *
 * 鍵は Stripe の Checkout セッション ID（決済後のリダイレクト URL に付いてくる、推測できない文字列）。
 * ⚠ 返すのは完了画面に出す3項目だけ。申込行・顧客行を丸ごと返さない。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const sessionId = request.nextUrl.searchParams.get('session_id') ?? ''
  // Checkout セッション ID の形（cs_test_… / cs_live_…）でなければ引かない
  if (!/^cs_[A-Za-z0-9_]{10,250}$/.test(sessionId)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('school_enrollments')
    .select('class_name, student_name, customer:customers(email)')
    .eq('stripe_payment_intent_id', sessionId)
    .maybeSingle()

  if (error) {
    console.error('[school-enrollment] lookup failed:', error.code, error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // PostgREST は多対一でもリレーションを配列で返すことがあるため両方を見る
  const customer = Array.isArray(data.customer) ? data.customer[0] : data.customer

  return NextResponse.json({
    enrollment: {
      class_name: data.class_name,
      student_name: data.student_name,
      email: customer?.email ?? null,
    },
  })
}
