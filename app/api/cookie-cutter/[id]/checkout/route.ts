import { NextRequest, NextResponse } from 'next/server'
import { stripe, checkoutExpiresAt } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_FEE, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { cutterUnitPrice, type CutterOrderKind, DOWNLOAD_VALID_DAYS } from '@/lib/cookie-cutter/pricing'
import { parseContours, generateStl, InvalidContourError } from '@/lib/cookie-cutter/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_QUANTITY = 10

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * クッキー型の購入。
 *   kind = 'download' … STLファイルのみ。発送しないので住所は取らない
 *   kind = 'print'    … こちらで印刷して発送する。住所を Stripe 側で受け取る
 *
 * ⚠ 金額はクライアントから受け取らない。lib/cookie-cutter/pricing.ts の値だけを使う。
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { email, name, phone, notes, quantity = 1 } = body as {
      email?: string
      name?: string
      phone?: string
      notes?: string
      quantity?: number
    }
    const kind: CutterOrderKind = body.kind === 'print' ? 'print' : 'download'

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
    }
    if (!email || !emailValid(email)) {
      return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
    }
    if (notes && notes.length > 1000) {
      return NextResponse.json({ error: 'ご要望は1000文字以内で入力してください' }, { status: 400 })
    }
    // データは何個買っても同じファイルなので、数量を持つのは発送のときだけ
    const qty = kind === 'print'
      ? Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(quantity) || 1)))
      : 1

    const { data: design, error: designError } = await supabaseAdmin
      .from('cutter_designs')
      .select('id, title, contour, params, size_mm')
      .eq('id', id)
      .single()

    if (designError || !design) {
      return NextResponse.json({ error: 'デザインが見つかりません' }, { status: 404 })
    }

    // ⚠ 決済させる前に、そのデータが本当に作れるかをここで確かめる。
    //   払ってもらってから「作れませんでした」は返金対応になる。
    try {
      generateStl(parseContours(design.contour), design.params)
    } catch (err) {
      if (err instanceof InvalidContourError) {
        return NextResponse.json({ error: err.message }, { status: 400 })
      }
      throw err
    }

    const unitPrice = cutterUnitPrice(kind)
    const shippingFee = kind === 'print' ? SHIPPING_FEE : 0
    const totalAmount = unitPrice * qty + shippingFee

    const customerPayload: { email: string; name: string; phone?: string } = { email, name }
    if (phone && phone.trim()) customerPayload.phone = phone.trim()

    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(customerPayload, { onConflict: 'email' })
      .select()
      .single()

    if (customerError || !customer) {
      console.error('customer upsert failed:', customerError)
      return NextResponse.json({ error: '顧客情報の保存に失敗しました' }, { status: 500 })
    }

    // 設計に購入者を紐づけておく（あとから「自分の作ったもの」を辿れるように）
    await supabaseAdmin
      .from('cutter_designs')
      .update({ customer_id: customer.id })
      .eq('id', id)
      .is('customer_id', null)

    const { data: order, error: orderError } = await supabaseAdmin
      .from('cutter_orders')
      .insert({
        design_id: id,
        customer_id: customer.id,
        kind,
        quantity: qty,
        unit_price: unitPrice,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        notes: notes || null,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('cutter_orders insert failed:', orderError)
      return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 })
    }

    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    const designName = design.title ? `オリジナルクッキー型「${design.title}」` : 'オリジナルクッキー型'
    const description = kind === 'print'
      ? SHIPPING_LEAD_TIME_TEXT
      : `3Dプリント用データ（STL形式）／ダウンロード期限 ${DOWNLOAD_VALID_DAYS}日`

    const lineItems = [
      {
        price_data: {
          currency: 'jpy' as const,
          product_data: {
            name: kind === 'print' ? `${designName}（印刷して発送）` : `${designName}（データ）`,
            description,
          },
          unit_amount: unitPrice,
        },
        quantity: qty,
      },
    ]

    if (shippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'jpy' as const,
          product_data: { name: '送料（全国一律）', description: SHIPPING_LEAD_TIME_TEXT },
          unit_amount: shippingFee,
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: email,
      locale: 'ja',
      expires_at: checkoutExpiresAt(),
      // データだけの購入では住所を聞かない（要らない個人情報を集めない）
      ...(kind === 'print'
        ? {
            shipping_address_collection: { allowed_countries: ['JP' as const] },
            phone_number_collection: { enabled: true },
          }
        : {}),
      success_url: `${baseUrl}/cookie-cutter/success?order_id=${order.id}`,
      cancel_url: `${baseUrl}/cookie-cutter?design=${id}`,
      metadata: {
        type: 'cutter_order',
        order_id: order.id,
        design_id: id,
        kind,
      },
    })

    await supabaseAdmin
      .from('cutter_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('cutter checkout error:', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
