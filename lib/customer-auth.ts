import 'server-only'
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 顧客アカウント（会員）のログイン。
 *
 * ⚠ Supabase Auth は使わない。この Supabase は複数アプリが同じ public スキーマに同居し、
 *   auth.users も共有している。他アプリに「ログイン済みなら誰でも更新・削除できる」
 *   ポリシーが残っているため、顧客を auth.users に入れるとその権限まで配ることになる。
 *   （supabase/migrations/20260903_add_customer_accounts.sql に経緯）
 *
 * 仕組み: ログインに成功したら httpOnly の `customer_session` を配る。
 *   値は `<顧客ID>.<失効時刻>.<HMAC>`。DB にセッション表は持たない。
 *   - httpOnly なので JS からは作れない
 *   - HMAC の材料に「今のパスワードハッシュの指紋」を混ぜてあるので、
 *     パスワードを変えると発行済みのセッションが全部無効になる
 *   - 失効時刻も署名対象なので、期限だけ書き換えることはできない
 */

const COOKIE_NAME = 'customer_session'
export const CUSTOMER_SESSION_COOKIE = COOKIE_NAME

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30日
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 1日
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1時間

/** bcrypt のコスト。上げるほど総当たりが遅くなるが、ログインも遅くなる */
const BCRYPT_ROUNDS = 12

/**
 * 署名鍵。
 * CUSTOMER_SESSION_SECRET があればそれを使い、無ければサービスロールキーから導出する。
 * ⚠ 導出する場合もラベルを付けて、他の用途の署名と同じ値にならないようにする。
 */
function sessionSecret(): string {
  const explicit = process.env.CUSTOMER_SESSION_SECRET
  if (explicit && explicit.length >= 16) return explicit

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error('CUSTOMER_SESSION_SECRET も SUPABASE_SERVICE_ROLE_KEY も無い')
  return `customer-session-v1:${fallback}`
}

// ---- パスワード ----

export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string') return 'パスワードを入力してください'
  if (password.length < 8) return 'パスワードは8文字以上にしてください'
  if (password.length > 200) return 'パスワードが長すぎます'
  // 数字だけ・同じ文字だけのような、破られやすいものを弾く
  if (/^(.)\1+$/.test(password)) return '同じ文字だけのパスワードは使えません'
  if (/^\d+$/.test(password)) return '数字だけのパスワードは使えません'
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ---- セッション ----

/** パスワードを変えたら発行済みセッションが無効になるよう、ハッシュの指紋を署名に混ぜる */
function passwordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16)
}

function signSession(customerId: string, expiresAt: number, passwordHash: string): string {
  return createHmac('sha256', sessionSecret())
    .update(`${customerId}.${expiresAt}.${passwordFingerprint(passwordHash)}`)
    .digest('hex')
}

export function issueSession(
  customerId: string,
  passwordHash: string
): { name: string; value: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const signature = signSession(customerId, expiresAt, passwordHash)
  return {
    name: COOKIE_NAME,
    value: `${customerId}.${expiresAt}.${signature}`,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  }
}

export interface CustomerAccount {
  id: string
  email: string
  name: string
  phone: string | null
  address: string | null
  email_verified_at: string | null
}

/**
 * いまログインしている会員。ログインしていなければ null。
 * ⚠ 署名の検証だけで済ませず、必ず DB を読む。パスワード変更や退会を反映するため。
 */
export async function currentCustomer(): Promise<CustomerAccount | null> {
  if (!supabaseAdmin) return null

  const raw = (await cookies()).get(COOKIE_NAME)?.value
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [customerId, expiresRaw, signature] = parts

  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return null

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, email, name, phone, address, password_hash, email_verified_at')
    .eq('id', customerId)
    .single()

  if (!customer?.password_hash || !customer.email_verified_at) return null

  const expected = signSession(customerId, expiresAt, customer.password_hash)
  // ⚠ === で比べない。掛かった時間から正解が漏れる
  const a = Buffer.from(signature, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    email_verified_at: customer.email_verified_at,
  }
}

// ---- メール確認・パスワード再設定の合言葉 ----

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * 合言葉を1つ発行する。戻り値はメールに載せる平文。
 * ⚠ DB にはハッシュだけを入れる。平文を保存すると、DB を読めた人が
 *   任意のアカウントのパスワードを再設定できてしまう。
 */
export async function createAuthToken(
  customerId: string,
  kind: 'verify' | 'reset',
  ttlMs: number
): Promise<string> {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')

  const token = randomBytes(32).toString('base64url')

  // 同じ用途の古い合言葉は使えなくする（再送のたびに前のリンクを無効にする）
  await supabaseAdmin
    .from('customer_auth_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('customer_id', customerId)
    .eq('kind', kind)
    .is('used_at', null)

  const { error } = await supabaseAdmin.from('customer_auth_tokens').insert({
    customer_id: customerId,
    kind,
    token_hash: tokenHash(token),
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
  })
  if (error) throw new Error(`auth token insert failed: ${error.message}`)

  return token
}

/** 合言葉を1回だけ使う。使えたら顧客IDを返す */
export async function consumeAuthToken(
  token: unknown,
  kind: 'verify' | 'reset'
): Promise<string | null> {
  if (!supabaseAdmin) return null
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null

  const { data: row } = await supabaseAdmin
    .from('customer_auth_tokens')
    .select('id, customer_id, expires_at, used_at')
    .eq('token_hash', tokenHash(token))
    .eq('kind', kind)
    .single()

  if (!row || row.used_at) return null
  if (new Date(row.expires_at) < new Date()) return null

  // 使用済みにできたときだけ通す。二重に使われないよう used_at が空のものだけ更新する
  const { data: updated } = await supabaseAdmin
    .from('customer_auth_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id')

  if (!updated || updated.length === 0) return null
  return row.customer_id
}
