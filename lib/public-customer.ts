import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * 公開の申込フォーム（予約・スクール申込・制作依頼）が顧客行を作る／更新するための共通処理。
 *
 * ⚠ サーバー専用。service role のクライアントを受け取る。
 * ⚠ 顧客行を丸ごと返さない。返すのは id だけ。customers にはログイン用の列もあるので、
 *   `select()`（＝全列）の結果をブラウザへ渡す形にしない。
 */

/** customers の列幅（VARCHAR）。超えると DB が落ちて原因の分からない 500 になるので先に弾く */
const NAME_MAX = 255
const EMAIL_MAX = 255
const PHONE_MAX = 20

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const
export type CustomerGender = (typeof GENDERS)[number]

export type CustomerContact = { email: string; name: string; phone: string }

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

/**
 * フォームの「お名前・メール・電話」を確かめる。
 * 電話が必須かどうかはフォームごとに違う（予約・スクール申込は必須、制作依頼は任意）ので呼び出し側が決める。
 */
export function parseCustomerContact(
  input: { name?: unknown; email?: unknown; phone?: unknown },
  { phoneRequired }: { phoneRequired: boolean },
): Parsed<CustomerContact> {
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const email = typeof input.email === 'string' ? input.email.trim() : ''
  const phone = typeof input.phone === 'string' ? input.phone.trim() : ''

  if (!name || name.length > NAME_MAX) return { ok: false, error: 'お名前を正しく入力してください' }
  if (!EMAIL_RE.test(email) || email.length > EMAIL_MAX) {
    return { ok: false, error: 'メールアドレスを正しく入力してください' }
  }
  if (phoneRequired && !phone) return { ok: false, error: '電話番号を入力してください' }
  if (phone.length > PHONE_MAX) return { ok: false, error: `電話番号は${PHONE_MAX}文字以内で入力してください` }

  return { ok: true, value: { name, email, phone } }
}

/** 年齢（任意）。空は null。入っているのに 1〜150 の整数でなければエラー */
export function parseOptionalAge(value: unknown): Parsed<number | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 150) return { ok: false, error: '年齢は 1〜150 の整数で入力してください' }
  return { ok: true, value: n }
}

/** 性別（任意）。空は null。入っているのに知らない値ならエラー */
export function parseOptionalGender(value: unknown): Parsed<CustomerGender | null> {
  if (value === undefined || value === null || value === '') return { ok: true, value: null }
  const found = GENDERS.find((g) => g === value)
  if (!found) return { ok: false, error: '性別の値が不正です' }
  return { ok: true, value: found }
}

/**
 * メールアドレスで顧客行を探し、無ければ作り、あれば名前・電話などを今回の入力で更新する。
 * 渡さなかった列（年齢・性別・住所を省いた場合）は元の値のまま残る。
 *
 * ⚠ 会員（パスワードを登録済み）の行は、本人がログインしているときだけ更新する。
 *   申込フォームはログイン不要で、メールアドレスは自己申告。他人のメールアドレスを入れるだけで
 *   その人の氏名・電話・住所を書き換えられると、会員のフォームの初期値（配送先など）が
 *   他人の値になる。会員登録（app/api/account/register）が既存の行を書き換えないのと同じ理由。
 *   会員でない行は従来どおり今回の入力で更新する（連絡先の変更を受け取る手段がほかに無い）。
 *
 * @param loggedInCustomerId いまログインしている会員の id（lib/customer-auth.ts の currentCustomer()）。未ログインは null
 */
export async function upsertCustomerByEmail(
  admin: SupabaseClient,
  contact: CustomerContact,
  extra: { age?: number; gender?: CustomerGender; address?: string } = {},
  loggedInCustomerId: string | null = null,
): Promise<{ id: string } | null> {
  const { data: existing, error: lookupError } = await admin
    .from('customers')
    .select('id, password_hash')
    .eq('email', contact.email)
    .maybeSingle()
  if (lookupError) {
    console.error('[public-customer] lookup failed:', lookupError.code, lookupError.message)
    return null
  }
  if (existing?.password_hash && existing.id !== loggedInCustomerId) {
    return { id: existing.id as string }
  }

  // 電話が任意のフォームで空欄だったときは、電話の列に触らない（登録済みの電話番号を空で上書きしない）
  const { phone, ...rest } = contact
  const { data, error } = await admin
    .from('customers')
    .upsert({ ...rest, ...(phone ? { phone } : {}), ...extra }, { onConflict: 'email' })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[public-customer] upsert failed:', error?.code, error?.message)
    return null
  }
  return { id: data.id as string }
}
