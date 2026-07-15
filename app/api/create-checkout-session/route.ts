import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workshop_id, booking_id, customer_email, participants, coupon_id, discount_amount } = body

    // リクエストから現在のホストを取得
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available')
    }

    // ワークショップ情報を取得
    const { data: workshop } = await supabaseAdmin
      .from('workshops')
      .select('*')
      .eq('id', workshop_id)
      .single()

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // 金額はサーバー側でDBの価格から再計算する（クライアント送信値は信用しない）
    const qty = participants || 1
    const base = workshop.price * qty

    // 早割: 先着 early_bird_slots 組（キャンセル以外の予約行数）以内なら「1名あたり割引」を適用。
    // 現在の予約行（作成済みpending）は除外して数える。
    let earlyBirdDiscount = 0
    if (
      workshop.early_bird_enabled &&
      (workshop.early_bird_discount ?? 0) > 0 &&
      (workshop.early_bird_slots ?? 0) > 0
    ) {
      const { count } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('workshop_id', workshop_id)
        .neq('status', 'cancelled')
        .neq('id', booking_id)
      if ((count ?? 0) < workshop.early_bird_slots) {
        earlyBirdDiscount = workshop.early_bird_discount * qty
      }
    }

    // クーポン割引はクライアント値を上限クランプして使用（既存挙動の踏襲）
    const couponDiscount = Math.max(0, Math.min(discount_amount || 0, base))
    const totalDiscount = couponDiscount + earlyBirdDiscount
    // Stripeの最低決済金額(¥50)を下回らないようにクランプ
    const unitAmount = Math.max(50, base - totalDiscount)

    // Stripe Checkout セッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: workshop.title,
              description: `${workshop.description} (${participants}名)`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: customer_email,
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/workshops/${workshop_id}`,
      metadata: {
        booking_id: booking_id,
        workshop_id: workshop_id,
        coupon_id: coupon_id || '',
        discount_amount: couponDiscount,
        early_bird_discount: earlyBirdDiscount,
      },
    })

    // 予約にStripeセッションIDと割引情報を保存（total_amountは満額のまま、割引はdiscount_amountに集約）
    await supabaseAdmin
      .from('bookings')
      .update({
        stripe_session_id: session.id,
        coupon_id: coupon_id || null,
        discount_amount: totalDiscount
      })
      .eq('id', booking_id)

    // メール送信はWebhookで決済完了後に行うため、ここでは送信しない
    // 決済完了の確認はStripe Webhookで行います

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    )
  }
}