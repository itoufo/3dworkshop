import 'server-only'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SELLER_MIN_ENROLLED_MONTHS } from './urls'

/**
 * 出品資格（スクール在籍 SELLER_MIN_ENROLLED_MONTHS ヶ月以上）の判定。
 *
 * ⚠ 在籍の事実は Stripe の定期課金（月謝）から取る。DB の school_enrollments と customers は
 *   公開 anon キーで書き換えられるので、DB の status や開始日だけを信じると、
 *   誰でも「在籍3ヶ月」を作れてしまう。Stripe の値は外から書き換えられない。
 *   DB は「どの定期課金を見ればよいか」を知るためだけに使う。
 * ⚠ Stripe の定期課金が「本人のもの」であることも確かめる。school_enrollments は anon で書けるので、
 *   他人の定期課金 ID を自分の行に書き込めば、その定期課金は Stripe 上は正しく「継続中」に見える。
 *   Stripe の顧客メールが MiraiID で確認済みのメールと一致したときだけ確認済みにする。
 * ⚠ Stripe を通らない在籍（無料クラス・手入力）・メールが違うものは「未確認」として返す。
 *   申請は受け付け、管理者が承認時に確かめる。
 * ⚠ 見る在籍の数に上限を置く。anon で在籍の行をいくらでも足せるので、上限が無いと
 *   1回の判定で Stripe を何千回も呼ばされ、決済と共用のレート制限を使い切る。
 */

export type EnrollmentCheck = {
  enrollmentId: string
  studentName: string | null
  /** DB 上の状態（参考。書き換えられうる） */
  dbStatus: string | null
  /** Stripe で確かめた結果。Stripe を通っていなければ null */
  stripe: {
    subscriptionId: string
    status: Stripe.Subscription.Status
    /** 定期課金が始まった日（ISO） */
    startedAt: string
    /** Stripe の顧客メール。ログインのメールと見比べる */
    customerEmail: string | null
  } | null
}

export type Eligibility = {
  /** Stripe で「本人の定期課金が継続中かつ開始から規定月数以上」を確かめられた */
  verified: boolean
  /** 確かめきれないが在籍の手がかりがある（管理者の確認が要る） */
  unverifiedEnrollment: boolean
  checks: EnrollmentCheck[]
}

const MAX_ENROLLMENTS = 10

const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']

function monthsAgo(months: number): Date {
  const d = new Date()
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() - months)
  // 31日から3ヶ月戻すと月末が無い月にはみ出すので、その月の末日で止める
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

/**
 * @param customerId    在籍を探す手がかり（customers 行）
 * @param verifiedEmail MiraiID で確認済みのメール。Stripe の顧客メールと突き合わせる
 */
export async function checkSellerEligibility(customerId: string, verifiedEmail: string): Promise<Eligibility> {
  const empty: Eligibility = { verified: false, unverifiedEnrollment: false, checks: [] }
  if (!supabaseAdmin) return empty

  const { data: enrollments, error } = await supabaseAdmin
    .from('school_enrollments')
    .select('id, student_name, status, start_date, stripe_subscription_id')
    .eq('customer_id', customerId)
    .order('start_date', { ascending: true })
    .limit(MAX_ENROLLMENTS)
  if (error) {
    console.error('[store-eligibility] enrollment lookup failed:', error)
    return empty
  }

  const threshold = monthsAgo(SELLER_MIN_ENROLLED_MONTHS)
  const checks: EnrollmentCheck[] = []
  let verified = false
  let unverifiedEnrollment = false

  for (const e of enrollments ?? []) {
    let stripeResult: EnrollmentCheck['stripe'] = null
    if (e.stripe_subscription_id) {
      try {
        const sub = await stripe.subscriptions.retrieve(e.stripe_subscription_id, { expand: ['customer'] })
        const customer = sub.customer as Stripe.Customer | Stripe.DeletedCustomer
        stripeResult = {
          subscriptionId: sub.id,
          status: sub.status,
          startedAt: new Date(sub.start_date * 1000).toISOString(),
          customerEmail: 'email' in customer ? customer.email?.toLowerCase() ?? null : null,
        }
        const longEnough = ACTIVE_STATUSES.includes(sub.status) && sub.start_date * 1000 <= threshold.getTime()
        if (longEnough && stripeResult.customerEmail === verifiedEmail.toLowerCase()) {
          verified = true
        } else if (longEnough) {
          // 継続中だがメールが違う（本人が別のアドレスで申し込んだか、他人の定期課金か）
          unverifiedEnrollment = true
        }
      } catch (err) {
        // 存在しない ID（書き換えられた可能性も）・Stripe 障害。確かめられないものは資格にしない
        console.error('[store-eligibility] subscription lookup failed:', e.stripe_subscription_id, err)
      }
    } else if (
      e.status === 'active' &&
      e.start_date &&
      new Date(e.start_date).getTime() <= threshold.getTime()
    ) {
      unverifiedEnrollment = true
    }

    checks.push({
      enrollmentId: e.id,
      studentName: e.student_name,
      dbStatus: e.status,
      stripe: stripeResult,
    })
    // 確認できたらそれ以上 Stripe を呼ばない
    if (verified) break
  }

  return { verified, unverifiedEnrollment, checks }
}
