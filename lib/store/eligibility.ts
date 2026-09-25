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
 * ⚠ Stripe を通らない在籍（無料クラス・手入力）は「未確認」として返す。
 *   申請は受け付け、管理者が承認時に確かめる。
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
  /** Stripe で「継続中かつ開始から規定月数以上」を確かめられた */
  verified: boolean
  /** Stripe では確かめられないが、DB 上は在籍がある（管理者の確認が要る） */
  unverifiedEnrollment: boolean
  checks: EnrollmentCheck[]
}

const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']

function monthsAgo(months: number): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d
}

export async function checkSellerEligibility(customerId: string): Promise<Eligibility> {
  const empty: Eligibility = { verified: false, unverifiedEnrollment: false, checks: [] }
  if (!supabaseAdmin) return empty

  const { data: enrollments, error } = await supabaseAdmin
    .from('school_enrollments')
    .select('id, student_name, status, start_date, stripe_subscription_id')
    .eq('customer_id', customerId)
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
        if (ACTIVE_STATUSES.includes(sub.status) && sub.start_date * 1000 <= threshold.getTime()) {
          verified = true
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
  }

  return { verified, unverifiedEnrollment, checks }
}
