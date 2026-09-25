import 'server-only'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SELLER_MIN_ENROLLED_MONTHS } from './urls'

/**
 * 出品資格（スクール在籍 SELLER_MIN_ENROLLED_MONTHS ヶ月以上）の判定。
 *
 * ⚠ 確認は Stripe だけで行う。MiraiID で確認済みのメールで Stripe の顧客を探し、
 *   その顧客のスクールの定期課金（metadata.type = 'school_enrollment'）を見る。
 *   DB の school_enrollments / customers は公開 anon キーで書き換えられるので、
 *   そこを起点にすると「他人の定期課金 ID を自分の行に書く」「本人の行の前に偽の行を
 *   大量に足して本物を読ませない」といった細工が効いてしまう。
 * ⚠ Stripe を呼ぶ回数は固定の上限（検索1回＋顧客ごとに1回、顧客は MAX_CUSTOMERS まで）。
 * ⚠ DB 上の在籍は「確かめられないが手がかりはある」（未確認）としてだけ使う。Stripe は呼ばない。
 *   申請は受け付け、管理者が承認時に確かめる（無料クラス・手入力の在籍、別のメールで申し込んだ人）。
 */

// 同じメールで Stripe の顧客が複数できていることがある（実在の在籍で2件）。スクールの定期課金がどれに付いていても拾う
const MAX_CUSTOMERS = 10
const MAX_DB_ROWS = 20
const ACTIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due']

export type EnrollmentCheck =
  | {
      source: 'stripe'
      subscriptionId: string
      status: Stripe.Subscription.Status
      /** 定期課金が始まった日（ISO） */
      startedAt: string
      customerEmail: string | null
      /** 継続中かつ規定月数以上（＝資格あり） */
      qualifies: boolean
    }
  | {
      source: 'db'
      enrollmentId: string
      studentName: string | null
      /** DB 上の状態・開始日（参考。書き換えられうる） */
      dbStatus: string | null
      startDate: string | null
      subscriptionId: string | null
    }

export type Eligibility = {
  /** Stripe で本人のスクールの定期課金が継続中・規定月数以上と確かめられた */
  verified: boolean
  /** Stripe では確かめられないが、DB 上に規定月数以上の在籍がある（管理者の確認が要る） */
  unverifiedEnrollment: boolean
  checks: EnrollmentCheck[]
}

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

async function stripeChecks(verifiedEmail: string, threshold: Date): Promise<EnrollmentCheck[]> {
  // 検索クエリに埋め込むので、引用符・バックスラッシュを含むメールは探さない
  if (/['"\\]/.test(verifiedEmail)) return []
  const checks: EnrollmentCheck[] = []
  try {
    // email の完全一致（大文字小文字は区別しない）。スクール申込で大文字まじりに入力した人も見つける
    const customers = await stripe.customers.search({ query: `email:'${verifiedEmail}'`, limit: MAX_CUSTOMERS })
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 20 })
      for (const sub of subs.data) {
        if (sub.metadata?.type !== 'school_enrollment') continue
        checks.push({
          source: 'stripe',
          subscriptionId: sub.id,
          status: sub.status,
          startedAt: new Date(sub.start_date * 1000).toISOString(),
          customerEmail: customer.email?.toLowerCase() ?? null,
          qualifies: ACTIVE_STATUSES.includes(sub.status) && sub.start_date * 1000 <= threshold.getTime(),
        })
      }
    }
  } catch (err) {
    console.error('[store-eligibility] stripe lookup failed:', err)
  }
  return checks
}

/**
 * @param customerId    DB 上の在籍を探す手がかり（customers 行。未確認の判定にだけ使う）
 * @param verifiedEmail MiraiID で確認済みのメール。Stripe の顧客をこれで探す
 */
export async function checkSellerEligibility(customerId: string, verifiedEmail: string): Promise<Eligibility> {
  const threshold = monthsAgo(SELLER_MIN_ENROLLED_MONTHS)
  const checks = await stripeChecks(verifiedEmail.toLowerCase(), threshold)
  const verified = checks.some((c) => c.source === 'stripe' && c.qualifies)

  let unverifiedEnrollment = false
  if (supabaseAdmin) {
    const { data: rows, error } = await supabaseAdmin
      .from('school_enrollments')
      .select('id, student_name, status, start_date, stripe_subscription_id')
      .eq('customer_id', customerId)
      .order('start_date', { ascending: false })
      .limit(MAX_DB_ROWS)
    if (error) console.error('[store-eligibility] enrollment lookup failed:', error)
    for (const e of rows ?? []) {
      checks.push({
        source: 'db',
        enrollmentId: e.id,
        studentName: e.student_name,
        dbStatus: e.status,
        startDate: e.start_date,
        subscriptionId: e.stripe_subscription_id,
      })
      if (e.status === 'active' && e.start_date && new Date(e.start_date).getTime() <= threshold.getTime()) {
        unverifiedEnrollment = true
      }
    }
  }

  return { verified, unverifiedEnrollment: !verified && unverifiedEnrollment, checks }
}
