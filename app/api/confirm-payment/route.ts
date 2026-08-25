import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, bookingId: freeBookingId } = await request.json()

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available')
    }

    // 無料ワークショップは Stripe を経由しないため sessionId が無い。
    // 確定済みの予約を booking_id で引いて完了画面に返すだけ（ここでは何も更新しない）。
    if (!sessionId && freeBookingId) {
      const { data: freeBooking, error: freeError } = await supabaseAdmin
        .from('bookings')
        .select(`
          *,
          workshop:workshops(*),
          customer:customers(*)
        `)
        .eq('id', freeBookingId)
        .single()

      if (freeError || !freeBooking) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      // 有料の予約を決済なしで完了扱いにしない
      if ((freeBooking.workshop?.price ?? 0) > 0 || freeBooking.status !== 'confirmed') {
        return NextResponse.json({ error: 'Booking not confirmed' }, { status: 400 })
      }

      return NextResponse.json({ success: true, booking: freeBooking })
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    // Stripeからセッション情報を取得
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer']
    })

    // 支払いが完了していることを確認
    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      )
    }

    // メタデータから予約IDとクーポン情報を取得
    const bookingId = session.metadata?.booking_id
    const couponId = session.metadata?.coupon_id
    const discountAmount = parseInt(session.metadata?.discount_amount || '0')

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID not found in session' },
        { status: 400 }
      )
    }

    // 予約情報を更新
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available')
    }
    
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        stripe_session_id: sessionId,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' 
          ? session.payment_intent 
          : session.payment_intent?.id || null
      })
      .eq('id', bookingId)
      .select(`
        *,
        workshop:workshops(*),
        customer:customers(*)
      `)
      .single()

    if (bookingError) {
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

    // 顧客のStripe IDを更新（存在する場合）
    if (session.customer && session.customer_email) {
      await supabaseAdmin
        .from('customers')
        .update({
          stripe_customer_id: typeof session.customer === 'string' 
            ? session.customer 
            : session.customer.id
        })
        .eq('email', session.customer_email)
    }

    return NextResponse.json({ 
      success: true,
      booking 
    })

  } catch (error) {
    console.error('Error confirming payment:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}