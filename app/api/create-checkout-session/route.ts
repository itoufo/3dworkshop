import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workshop_id, booking_id, customer_email, amount, participants, coupon_id, discount_amount } = body

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
            unit_amount: amount - (discount_amount || 0),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: customer_email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/workshops/${workshop_id}`,
      metadata: {
        booking_id: booking_id,
        workshop_id: workshop_id,
        coupon_id: coupon_id || '',
        discount_amount: discount_amount || 0,
      },
    })

    // 予約にStripeセッションIDとクーポン情報を保存
    await supabaseAdmin
      .from('bookings')
      .update({ 
        stripe_session_id: session.id,
        coupon_id: coupon_id || null,
        discount_amount: discount_amount || 0
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