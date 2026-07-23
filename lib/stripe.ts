import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
})

// Checkout Session の有効期限（＝席を保留しておく時間）。
// 未指定だと Stripe デフォルトの24時間になり、決済せず離脱した予約が
// 翌日まで定員を埋め続けるため、Stripe が許す最短の30分に短縮している。
export const CHECKOUT_HOLD_MINUTES = 30

// Stripe は「リクエスト受信時点から30分以上先」を要求するため、
// 通信ラグでちょうど30分を切って弾かれないよう60秒だけ余裕を持たせる。
const CHECKOUT_EXPIRY_BUFFER_SECONDS = 60

/** Checkout Session の expires_at（Unix秒）を返す */
export function checkoutExpiresAt(): number {
  return (
    Math.floor(Date.now() / 1000) +
    CHECKOUT_HOLD_MINUTES * 60 +
    CHECKOUT_EXPIRY_BUFFER_SECONDS
  )
}