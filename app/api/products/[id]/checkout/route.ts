import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_FEE, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { firstImageUrl } from '@/lib/media'

const MAX_QUANTITY = 20

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { email, name, phone, quantity = 1, notes } = body as {
      email?: string
      name?: string
      phone?: string
      quantity?: number
      notes?: string
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
    }
    if (!email || !emailValid(email)) {
      return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
    }
    if (notes && notes.length > 1000) {
      return NextResponse.json({ error: 'ご要望は1000文字以内で入力してください' }, { status: 400 })
    }
    const qty = Math.max(1, Math.min(MAX_QUANTITY, Math.floor(Number(quantity) || 1)))

    // 金額と在庫はクライアント送信値を信用せず、DB から取り直す
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, description, base_price, media_urls, is_active, stock_quantity')
      .eq('id', id)
      .single()

    if (productError || !product || !product.is_active) {
      return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 })
    }
    // stock_quantity が null の商品は在庫無制限（受注生産）
    if (product.stock_quantity !== null && product.stock_quantity < qty) {
      return NextResponse.json(
        { error: product.stock_quantity <= 0 ? '申し訳ありません、売り切れました' : `在庫が残り ${product.stock_quantity} 点です` },
        { status: 409 }
      )
    }

    const unitPrice = Math.floor(Number(product.base_price))
    const totalAmount = unitPrice * qty + SHIPPING_FEE

    // 既存客の電話番号を空欄で上書きしないよう、入力があったときだけ phone を含める
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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('product_orders')
      .insert({
        product_id: id,
        customer_id: customer.id,
        quantity: qty,
        unit_price: unitPrice,
        shipping_fee: SHIPPING_FEE,
        total_amount: totalAmount,
        notes: notes || null,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('product_orders insert failed:', orderError)
      return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 })
    }

    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    const lineItems = [
      {
        price_data: {
          currency: 'jpy' as const,
          product_data: {
            name: product.name,
            description: SHIPPING_LEAD_TIME_TEXT,
            // Stripe の決済画面に出す画像。動画は渡せないので最初の写真だけ
            images: [firstImageUrl(product.media_urls)].filter((url): url is string => Boolean(url)),
          },
          unit_amount: unitPrice,
        },
        quantity: qty,
      },
    ]

    if (SHIPPING_FEE > 0) {
      lineItems.push({
        price_data: {
          currency: 'jpy' as const,
          product_data: { name: '送料（全国一律）', description: SHIPPING_LEAD_TIME_TEXT, images: [] },
          unit_amount: SHIPPING_FEE,
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
      // 物販なのでお届け先を Stripe 側で受け取る（日本国内のみ）
      shipping_address_collection: { allowed_countries: ['JP'] },
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/products/success?order_id=${order.id}`,
      cancel_url: `${baseUrl}/products/${id}`,
      metadata: {
        type: 'product_order',
        order_id: order.id,
        product_id: id,
      },
    })

    await supabaseAdmin
      .from('product_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('product checkout error:', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
