import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil'
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      enrollment_id,
      class_type,
      customer_email,
      monthly_fee,
      registration_fee,
      coupon_id,
      discount_amount = 0
    } = body

    // Create line items for the checkout session
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    // Add registration fee
    lineItems.push({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: 'スクール入会金',
          description: '初回のみ・システム登録料含む'
        },
        unit_amount: registration_fee
      },
      quantity: 1
    })

    // Add first month fee for basic class only (free class gets first month free)
    if (class_type === 'basic') {
      lineItems.push({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: '基本実践クラス（授業＋作品作り）月謝',
            description: '初月分'
          },
          unit_amount: monthly_fee
        },
        quantity: 1
      })
    }

    // Create metadata for the session
    const metadata: Record<string, string> = {
      enrollment_id,
      class_type,
      monthly_fee: monthly_fee.toString(),
      registration_fee: registration_fee.toString(),
      type: 'school_enrollment'
    }

    // Add coupon information to metadata if applicable
    if (coupon_id && discount_amount > 0) {
      metadata.coupon_id = coupon_id
      metadata.discount_amount = discount_amount.toString()
    }

    // Create Checkout Session with discounts if applicable
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/school/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/school/apply?class=${class_type}`,
      customer_email,
      metadata,
      locale: 'ja'
    }

    // Apply discount if there's a coupon
    if (discount_amount > 0) {
      // Create a custom discount
      const discountCoupon = await stripe.coupons.create({
        amount_off: discount_amount,
        currency: 'jpy',
        duration: 'once',
        name: 'スクール申込割引'
      })

      sessionParams.discounts = [{
        coupon: discountCoupon.id
      }]
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Update the enrollment with Stripe session ID
    await supabase
      .from('school_enrollments')
      .update({ stripe_payment_intent_id: session.id })
      .eq('id', enrollment_id)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating school checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}