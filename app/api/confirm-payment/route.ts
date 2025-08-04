import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

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

    // メタデータから予約IDを取得
    const bookingId = session.metadata?.booking_id

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
        stripe_payment_intent_id: session.payment_intent?.id || null
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