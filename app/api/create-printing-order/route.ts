import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { parseCustomerContact, upsertCustomerByEmail } from '@/lib/public-customer'
import {
  PRINT_COLORS,
  PRINT_MATERIALS,
  PRINT_MAX_QUANTITY,
  PRINT_SIZES,
  calculatePrintingCost,
} from '@/lib/printing-order'
import { sendEmail, generate3DPrintingRequestEmail } from '@/app/lib/email'

/**
 * 3Dプリント制作依頼を受け付ける。依頼フォームの送信で呼ばれる。
 * 顧客行と依頼行を作り、受付の確認メールを送る（決済は通らない。正式な金額は確認後に連絡する運用）。
 *
 * ⚠ 金額はブラウザから受け取らず、サイズと個数から lib/printing-order.ts で計算する。
 * ⚠ 確認メールもここから送る。宛先・本文を外から指定できるメール送信口を別に置かない。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 10 * 60 * 1000
const MAX_ORDERS = 10
/** 同じメールアドレス宛ての依頼（＝確認メール）は1時間に3件まで */
const RECIPIENT_WINDOW_MS = 60 * 60 * 1000
const MAX_PER_RECIPIENT = 3

/** printing_orders の列幅（VARCHAR） */
const FILE_NAME_MAX = 255
const MATERIAL_COLOR_MAX = 50
const NOTES_MAX = 2000
const CUSTOM_COLOR_PREFIX = '特注: '

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseAdmin || !supabaseUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`create-printing-order:${ip}`, { windowMs: WINDOW_MS, max: MAX_ORDERS })) {
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

  const contact = parseCustomerContact(body, { phoneRequired: false })
  if (!contact.ok) return bad(contact.error)

  // STL はフォームが先に stl-files バケットへ上げている。そこ以外の URL は受け付けない
  const stlFileUrl = typeof body.stl_file_url === 'string' ? body.stl_file_url : ''
  if (!stlFileUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/stl-files/`)) {
    return bad('STLファイルをアップロードしてください')
  }
  const stlFileName = typeof body.stl_file_name === 'string' ? body.stl_file_name.trim() : ''
  if (!stlFileName) return bad('STLファイルをアップロードしてください')
  if (stlFileName.length > FILE_NAME_MAX) return bad(`ファイル名は${FILE_NAME_MAX}文字以内にしてください`)
  const fileSizeMb = Number(body.file_size_mb)
  if (!Number.isFinite(fileSizeMb) || fileSizeMb < 0) return bad('ファイルサイズが正しくありません')

  const size = PRINT_SIZES.find((s) => s.value === body.size)
  if (!size) return bad('サイズを選んでください')
  const quantity = Number(body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > PRINT_MAX_QUANTITY) {
    return bad(`数量は 1〜${PRINT_MAX_QUANTITY.toLocaleString()} 個で入力してください`)
  }
  const material = PRINT_MATERIALS.find((m) => m.value === body.material_type)
  if (!material) return bad('フィラメントを選んでください')
  const color = PRINT_COLORS.find((c) => c.value === body.material_color)
  if (!color) return bad('色を選んでください')

  const customColorRequest = typeof body.custom_color_request === 'string' ? body.custom_color_request.trim() : ''
  if (color.value === 'custom') {
    if (!customColorRequest) return bad('希望する色を入力してください')
    if (CUSTOM_COLOR_PREFIX.length + customColorRequest.length > MATERIAL_COLOR_MAX) {
      return bad(`希望する色は${MATERIAL_COLOR_MAX - CUSTOM_COLOR_PREFIX.length}文字以内で入力してください`)
    }
  }
  const notes = typeof body.notes === 'string' ? body.notes : ''
  // 黙って切り詰めない（書いたものが欠けたことに誰も気づけない）
  if (notes.length > NOTES_MAX) return bad(`備考は${NOTES_MAX}文字以内で入力してください`)

  // 確認メールは入力されたアドレスへ送る。同じ宛先へ何通も送らせない（他人のアドレスを入れて送り付けられる）
  const recipientKey = `create-printing-order-to:${contact.value.email.toLowerCase()}`
  if (await tooManyRequests(recipientKey, { windowMs: RECIPIENT_WINDOW_MS, max: MAX_PER_RECIPIENT })) {
    return NextResponse.json({ error: '短時間に送信が多すぎます。しばらくしてからお試しください。' }, { status: 429 })
  }

  const cost = calculatePrintingCost(quantity, size)

  const customer = await upsertCustomerByEmail(supabaseAdmin, contact.value)
  if (!customer) return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 })

  const orderNumber = `3DP-${Date.now()}`

  const { error } = await supabaseAdmin.from('printing_orders').insert({
    customer_id: customer.id,
    order_number: orderNumber,
    status: 'pending',
    stl_file_url: stlFileUrl,
    stl_file_name: stlFileName,
    file_size_mb: fileSizeMb,
    material_type: material.value,
    material_color: color.value === 'custom' ? `${CUSTOM_COLOR_PREFIX}${customColorRequest}` : color.value,
    layer_height: 0.4,
    infill_percentage: 20,
    notes: notes + (color.value === 'custom' ? `\n希望フィラメント: ${customColorRequest}` : ''),
    delivery_method: 'shipping',
    base_cost: cost.baseCost,
    material_cost: cost.materialCost,
    total_cost: cost.totalCost,
    print_size: size.value,
    print_quantity: quantity,
    unit_price: cost.unitPrice,
  })

  if (error) {
    console.error('[create-printing-order] insert failed:', error.code, error.message)
    return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 })
  }

  // 受付の確認メール。送信に失敗しても依頼は受け付け済みなので落とさない
  try {
    const emailContent = generate3DPrintingRequestEmail(
      contact.value.name,
      stlFileName,
      material.value,
      cost.totalCost,
      orderNumber,
    )
    const result = await sendEmail({
      to: contact.value.email,
      cc: ['yuho.ito@walker.co.jp', '3dlab@sunu25.com', 'nanzinaniwa6@gmail.com'],
      subject: emailContent.subject,
      html: emailContent.html,
    })
    if (!result.success) console.error(`[create-printing-order] ${orderNumber}: email failed:`, result.error)
  } catch (e) {
    console.error(`[create-printing-order] ${orderNumber}: email failed:`, e)
  }

  return NextResponse.json({ order_number: orderNumber }, { status: 201 })
}
