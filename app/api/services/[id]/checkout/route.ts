import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const {
      email,
      name,
      phone,
      quantity = 1,
      unitPrice: unitPriceInput,
      notes,
    } = body as {
      email?: string
      name?: string
      phone?: string
      quantity?: number
      unitPrice?: number
      notes?: string
    }

    if (!email || !emailValid(email)) {
      return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
    }
    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
    }
    const qty = Math.max(1, Math.min(1000, Math.floor(Number(quantity) || 1)))
    if (notes && notes.length > 2000) {
      return NextResponse.json({ error: 'ご要望は2000文字以内で入力してください' }, { status: 400 })
    }

    // サービス取得
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, type, title, description, price, is_active')
      .eq('id', id)
      .single()

    if (serviceError || !service || !service.is_active) {
      return NextResponse.json({ error: 'サービスが見つかりません' }, { status: 404 })
    }

    // 単価: クライアントから受け取った値を採用するが、最低料金未満は拒否
    const minPrice = service.price
    const requestedUnit = Math.floor(Number(unitPriceInput) || minPrice)
    if (requestedUnit < minPrice) {
      return NextResponse.json(
        { error: `単価は最低 ¥${minPrice.toLocaleString()} 以上に設定してください` },
        { status: 400 }
      )
    }
    if (requestedUnit > 10_000_000) {
      return NextResponse.json({ error: '単価が大きすぎます' }, { status: 400 })
    }
    const unitPrice = requestedUnit
    const totalAmount = unitPrice * qty

    // 顧客 upsert
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .upsert(
        {
          email,
          name,
          phone: phone || null,
        },
        { onConflict: 'email' }
      )
      .select()
      .single()

    if (customerError || !customer) {
      console.error('customer upsert failed:', customerError)
      return NextResponse.json({ error: '顧客情報の保存に失敗しました' }, { status: 500 })
    }

    // 注文を pending で作成
    const { data: order, error: orderError } = await supabaseAdmin
      .from('service_orders')
      .insert({
        service_id: id,
        customer_id: customer.id,
        quantity: qty,
        unit_price: unitPrice,
        total_amount: totalAmount,
        notes: notes || null,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('service_orders insert failed:', orderError)
      return NextResponse.json({ error: '注文の作成に失敗しました' }, { status: 500 })
    }

    // Stripe Checkout
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    const typeLabel = service.type === 'reprint' ? '追加印刷' : 'オーダーメイド'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `[${typeLabel}] ${service.title}`,
              description: notes ? `ご要望: ${notes.slice(0, 200)}` : undefined,
            },
            unit_amount: unitPrice,
          },
          quantity: qty,
        },
      ],
      mode: 'payment',
      customer_email: email,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/services/${id}`,
      metadata: {
        type: 'service_order',
        order_id: order.id,
        service_id: id,
      },
    })

    // セッションIDを保存
    await supabaseAdmin
      .from('service_orders')
      .update({ stripe_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (err) {
    console.error('service checkout error:', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
