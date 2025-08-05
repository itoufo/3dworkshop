import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { code, workshopId, amount, customerId } = await request.json()

    if (!code || !workshopId || !amount) {
      return NextResponse.json(
        { error: 'クーポンコード、ワークショップID、金額は必須です' },
        { status: 400 }
      )
    }

    // クーポンを取得
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single()

    if (couponError || !coupon) {
      return NextResponse.json(
        { error: '無効なクーポンコードです' },
        { status: 400 }
      )
    }

    // 有効期間チェック
    const now = new Date()
    const validFrom = new Date(coupon.valid_from)
    const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null

    if (now < validFrom || (validUntil && now > validUntil)) {
      return NextResponse.json(
        { error: 'このクーポンは有効期間外です' },
        { status: 400 }
      )
    }

    // 最低利用金額チェック
    if (coupon.minimum_amount && amount < coupon.minimum_amount) {
      return NextResponse.json(
        { error: `このクーポンは¥${coupon.minimum_amount.toLocaleString()}以上のご利用で使用可能です` },
        { status: 400 }
      )
    }

    // 使用回数上限チェック
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return NextResponse.json(
        { error: 'このクーポンは使用上限に達しました' },
        { status: 400 }
      )
    }

    // 対象ワークショップチェック
    if (coupon.workshop_ids && coupon.workshop_ids.length > 0) {
      if (!coupon.workshop_ids.includes(workshopId)) {
        return NextResponse.json(
          { error: 'このクーポンは対象外のワークショップです' },
          { status: 400 }
        )
      }
    }

    // ユーザーごとの使用回数チェック（顧客IDがある場合）
    if (customerId && coupon.user_limit) {
      const { data: usageCount } = await supabase
        .from('coupon_usage')
        .select('id')
        .eq('coupon_id', coupon.id)
        .eq('customer_id', customerId)

      if (usageCount && usageCount.length >= coupon.user_limit) {
        return NextResponse.json(
          { error: 'このクーポンの使用回数上限に達しています' },
          { status: 400 }
        )
      }
    }

    // 割引額を計算
    let discountAmount = 0
    if (coupon.discount_type === 'percentage') {
      discountAmount = Math.floor(amount * (coupon.discount_value / 100))
    } else {
      discountAmount = Math.min(coupon.discount_value, amount)
    }

    // 割引後の金額
    const finalAmount = amount - discountAmount

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value
      },
      discount_amount: discountAmount,
      final_amount: finalAmount
    })

  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { error: 'クーポンの検証中にエラーが発生しました' },
      { status: 500 }
    )
  }
}