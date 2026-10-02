import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { enrollment_id, customer_email, coupon_id } = body

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available')
    }

    // 月謝・入会金・クラスは申込行（/api/create-school-enrollment が lib/school-classes.ts から書いたもの）から取る。
    // ⚠ ブラウザが送った金額で請求しない。申込行に書いた金額と請求額が食い違うと、
    //   確認メール（申込行の金額を載せる）と実際の請求が合わなくなる
    if (typeof enrollment_id !== 'string' || !UUID.test(enrollment_id)) {
      return NextResponse.json({ error: '申込が見つかりません' }, { status: 404 })
    }
    const { data: enrollment } = await supabaseAdmin
      .from('school_enrollments')
      .select('id, class_type, monthly_fee, registration_fee')
      .eq('id', enrollment_id)
      .maybeSingle()
    if (!enrollment) {
      return NextResponse.json({ error: '申込が見つかりません' }, { status: 404 })
    }
    const class_type: string = enrollment.class_type
    // numeric の列は文字列で返ることがあるので数値にする
    const monthly_fee = Number(enrollment.monthly_fee)
    const registration_fee = Number(enrollment.registration_fee)
    // 割引は初回請求額（入会金 + 初月月謝）まで
    const discount_amount = Math.max(
      0,
      Math.min(Math.floor(Number(body.discount_amount) || 0), monthly_fee + registration_fee),
    )

    // リクエストから現在のホストを取得
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    // 月額サブスクリプション用の価格を作成（recurring）
    const recurringPrice = await stripe.prices.create({
      unit_amount: monthly_fee,
      currency: 'jpy',
      recurring: {
        interval: 'month'
      },
      product_data: {
        name: class_type === 'basic' 
          ? '基本実践クラス - 月謝（月2回・90分/回）'
          : '自由創作クラス - 月謝（月2回・120分/回）'
      }
    })

    // Line items: サブスクリプション（+ 入会金）
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: recurringPrice.id,  // 月額サブスクリプション
        quantity: 1
      }
    ]

    // 入会金無料キャンペーン中は 0 円になるため、行自体を追加しない
    // （Stripe は subscription モードで 0 円の one_time 明細を受け付けない）
    if (registration_fee > 0) {
      // 入会金用の一回限りの価格を作成（one_time）
      const onetimePrice = await stripe.prices.create({
        unit_amount: registration_fee,
        currency: 'jpy',
        product_data: {
          name: 'スクール入会金（初回のみ・システム登録料含む）'
        }
      })

      lineItems.push({
        price: onetimePrice.id,    // 入会金（一回限り）
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

    // Create Checkout Session in subscription mode
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',  // サブスクリプションモード
      success_url: `${baseUrl}/school/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/school/apply?class=${class_type}`,
      customer_email,
      metadata,
      locale: 'ja',
      // 無料トライアルは設けない。申込時に初月の月謝を課金し、以後は毎月同日に自動更新。
      // （trial_end を使うと Stripe の決済画面に「◯日間無料」と表示され、
      //   月末申込ほど短い日数が出て誤解を招くため廃止）
      subscription_data: {
        metadata
      }
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
    await supabaseAdmin
      .from('school_enrollments')
      .update({ stripe_payment_intent_id: session.id })
      .eq('id', enrollment_id)

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating school checkout session:', error)
    
    // More detailed error response for debugging
    const errorMessage = (error as Error)?.message || 'Failed to create checkout session'
    const errorDetails = {
      error: errorMessage,
      type: (error as Record<string, unknown>)?.type || 'unknown_error',
      code: (error as Record<string, unknown>)?.code || null
    }
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    )
  }
}