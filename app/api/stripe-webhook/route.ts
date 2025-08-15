import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, generateBookingConfirmationEmail } from '@/app/lib/email'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // 支払いが完了していることを確認
        if (session.payment_status !== 'paid') {
          console.log('Payment not completed for session:', session.id)
          return NextResponse.json({ received: true })
        }

        // メタデータから予約IDとクーポン情報を取得
        const bookingId = session.metadata?.booking_id
        const couponId = session.metadata?.coupon_id
        const discountAmount = parseInt(session.metadata?.discount_amount || '0')

        if (!bookingId) {
          console.error('Booking ID not found in session metadata')
          return NextResponse.json({ received: true })
        }

        if (!supabaseAdmin) {
          throw new Error('Supabase admin client not available')
        }

        // 予約情報を更新
        const { data: booking, error: bookingError } = await supabaseAdmin
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string
          })
          .eq('id', bookingId)
          .select(`
            *,
            workshops(*),
            customers(*)
          `)
          .single()

        if (bookingError) {
          console.error('Error updating booking:', bookingError)
          throw bookingError
        }

        // クーポンが使用された場合、使用履歴を記録
        if (couponId && discountAmount > 0 && booking) {
          // クーポンの現在の使用回数を取得
          const { data: couponData } = await supabaseAdmin
            .from('coupons')
            .select('usage_count')
            .eq('id', couponId)
            .single()
          
          if (couponData) {
            // クーポンの使用回数を増やす
            await supabaseAdmin
              .from('coupons')
              .update({
                usage_count: couponData.usage_count + 1
              })
              .eq('id', couponId)
          }

          // クーポン使用履歴を作成
          await supabaseAdmin
            .from('coupon_usage')
            .insert({
              coupon_id: couponId,
              booking_id: bookingId,
              customer_id: booking.customer_id,
              discount_amount: discountAmount
            })
        }

        // 顧客のStripe IDを更新
        if (session.customer && session.customer_email) {
          await supabaseAdmin
            .from('customers')
            .update({
              stripe_customer_id: session.customer as string
            })
            .eq('email', session.customer_email)
        }

        // 予約確認メールを送信（決済完了後）
        if (booking && booking.workshops && booking.customers) {
          const workshop = booking.workshops
          const customer = booking.customers
          
          const emailContent = generateBookingConfirmationEmail(
            workshop.title,
            workshop.event_date ? new Date(workshop.event_date).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            }) : '未定',
            workshop.event_time ? workshop.event_time.slice(0, 5) : '未定',
            workshop.location || '未定',
            customer.name,
            customer.email
          )

          await sendEmail({
            to: customer.email,
            cc: ['yuho.ito@walker.co.jp', 'y-sato@sunu25.com'],
            subject: emailContent.subject,
            html: emailContent.html
          })

          console.log(`Confirmation email sent to ${customer.email} for booking ${bookingId}`)
        }

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const bookingId = session.metadata?.booking_id

        if (bookingId && supabaseAdmin) {
          // セッションが期限切れになった場合、予約をキャンセル
          await supabaseAdmin
            .from('bookings')
            .update({
              status: 'cancelled',
              payment_status: 'failed'
            })
            .eq('id', bookingId)

          console.log(`Booking ${bookingId} cancelled due to expired session`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // payment_intentのメタデータから予約IDを取得
        if (paymentIntent.metadata?.booking_id && supabaseAdmin) {
          await supabaseAdmin
            .from('bookings')
            .update({
              status: 'cancelled',
              payment_status: 'failed'
            })
            .eq('id', paymentIntent.metadata.booking_id)

          console.log(`Booking ${paymentIntent.metadata.booking_id} cancelled due to payment failure`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}