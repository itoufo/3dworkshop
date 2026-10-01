import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_FEE, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { firstImageUrl } from '@/lib/media'
import { MAX_LINES, MAX_LINE_QUANTITY } from '@/lib/cart-limits'

/**
 * カートの中身をまとめて1回の Stripe 決済にする。
 *
 * product_orders は1行＝1商品のまま、商品ごとに1行作り、同じ checkout_id で束ねる。
 * 送料は1回の決済につき1回なので、最初の行にだけ載せる（売上の合計で二重に数えない）。
 *
 * ⚠ 金額・在庫・公開状態はブラウザの値を信用せず、ここで DB から取り直す。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const { email, name, phone, notes, items } = (body ?? {}) as {
      email?: string
      name?: string
      phone?: string
      notes?: string
      items?: { productId?: string; quantity?: number }[]
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
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'カートが空です' }, { status: 400 })
    }
    if (items.length > MAX_LINES) {
      return NextResponse.json({ error: `一度に購入できるのは ${MAX_LINES} 種類までです` }, { status: 400 })
    }

    // 同じ商品が2行に分かれて届いても1行にまとめる
    const wanted = new Map<string, number>()
    for (const item of items) {
      if (!item?.productId || !UUID.test(item.productId)) {
        return NextResponse.json({ error: 'カートの内容が正しくありません' }, { status: 400 })
      }
      const qty = Math.floor(Number(item.quantity) || 0)
      if (qty < 1) continue
      wanted.set(item.productId, Math.min(MAX_LINE_QUANTITY, (wanted.get(item.productId) ?? 0) + qty))
    }
    if (wanted.size === 0) {
      return NextResponse.json({ error: 'カートが空です' }, { status: 400 })
    }

    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, base_price, media_urls, is_active, stock_quantity, category')
      .in('id', [...wanted.keys()])
    if (productsError) {
      console.error('[cart/checkout] products', productsError)
      return NextResponse.json({ error: '商品情報の取得に失敗しました' }, { status: 500 })
    }

    const lines: { product: NonNullable<typeof products>[number]; qty: number; unitPrice: number }[] = []
    for (const [productId, qty] of wanted) {
      const product = (products ?? []).find((p) => p.id === productId)
      // 物販以外（3Dプリント発注など）はこの決済に乗せない
      if (!product || !product.is_active || product.category !== 'product') {
        return NextResponse.json(
          { error: 'カートに、現在は販売していない商品が入っています。カートから外してください。', productId },
          { status: 409 }
        )
      }
      // stock_quantity が null の商品は在庫無制限（受注製作）
      if (product.stock_quantity !== null && product.stock_quantity < qty) {
        return NextResponse.json(
          {
            error:
              product.stock_quantity <= 0
                ? `「${product.name}」は売り切れました。カートから外してください。`
                : `「${product.name}」は在庫が残り ${product.stock_quantity} 点です。数量を減らしてください。`,
            productId,
          },
          { status: 409 }
        )
      }
      lines.push({ product, qty, unitPrice: Math.floor(Number(product.base_price)) })
    }

    // 既存客の電話番号を空欄で上書きしないよう、入力があったときだけ phone を含める
    const customerPayload: { email: string; name: string; phone?: string } = { email, name: name.trim() }
    if (phone && phone.trim()) customerPayload.phone = phone.trim()
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(customerPayload, { onConflict: 'email' })
      .select()
      .single()
    if (customerError || !customer) {
      console.error('[cart/checkout] customer upsert', customerError)
      return NextResponse.json({ error: '顧客情報の保存に失敗しました' }, { status: 500 })
    }

    const checkoutId = randomUUID()
    const rows = lines.map((line, index) => {
      const shippingFee = index === 0 ? SHIPPING_FEE : 0
      return {
        product_id: line.product.id,
        customer_id: customer.id,
        quantity: line.qty,
        unit_price: line.unitPrice,
        shipping_fee: shippingFee,
        total_amount: line.unitPrice * line.qty + shippingFee,
        // ご要望は決済1回につき1つ。最初の行に入れる
        notes: index === 0 ? notes || null : null,
        status: 'pending',
        payment_status: 'pending',
        checkout_id: checkoutId,
      }
    })
    const { error: orderError } = await supabaseAdmin.from('product_orders').insert(rows)
    if (orderError) {
      console.error('[cart/checkout] product_orders insert', orderError)
      return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 })
    }

    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    const lineItems = lines.map((line) => ({
      price_data: {
        currency: 'jpy' as const,
        product_data: {
          name: line.product.name,
          description: SHIPPING_LEAD_TIME_TEXT,
          // Stripe の決済画面に出す画像。動画は渡せないので最初の写真だけ
          images: [firstImageUrl(line.product.media_urls)].filter((url): url is string => Boolean(url)),
        },
        unit_amount: line.unitPrice,
      },
      quantity: line.qty,
    }))
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
      success_url: `${baseUrl}/products/success?checkout_id=${checkoutId}`,
      cancel_url: `${baseUrl}/cart`,
      metadata: { type: 'product_cart', checkout_id: checkoutId },
    })

    await supabaseAdmin.from('product_orders').update({ stripe_session_id: session.id }).eq('checkout_id', checkoutId)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('[cart/checkout] error', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
