import 'server-only'
import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * stores.3dlab.jp のログイン状態。
 *
 * MiraiID でログインした人に、httpOnly の `store_session` を配る。
 *   値は `<MiraiIDのユーザーID>.<失効時刻>.<HMAC>`。DB にセッション表は持たない。
 * 3dlab.jp 側の会員ログイン（customer_session、lib/customer-auth.ts）とは別物。
 *   cookie はホスト限定なので、stores.3dlab.jp と 3dlab.jp で互いに見えない。
 */

export const STORE_SESSION_COOKIE = 'store_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30日

function sessionSecret(): string {
  const explicit = process.env.STORE_SESSION_SECRET
  if (explicit && explicit.length >= 16) return explicit

  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!fallback) throw new Error('STORE_SESSION_SECRET も SUPABASE_SERVICE_ROLE_KEY も無い')
  // ⚠ ラベルを変えて、customer_session の署名と同じ値にならないようにする
  return `store-session-v1:${fallback}`
}

function sign(miraiidUserId: string, expiresAt: number): string {
  return createHmac('sha256', sessionSecret()).update(`${miraiidUserId}.${expiresAt}`).digest('hex')
}

export function issueStoreSession(miraiidUserId: string): { name: string; value: string; maxAge: number } {
  const expiresAt = Date.now() + SESSION_TTL_MS
  return {
    name: STORE_SESSION_COOKIE,
    value: `${miraiidUserId}.${expiresAt}.${sign(miraiidUserId, expiresAt)}`,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  }
}

export const storeSessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export type SellerStatus = 'applied' | 'approved' | 'rejected' | 'suspended'

export interface StoreUser {
  miraiidUserId: string
  customerId: string
  email: string
  name: string
  seller: {
    id: string
    status: SellerStatus
    displayName: string
    slug: string
  } | null
}

/**
 * いまログインしている人。ログインしていなければ null。
 * ⚠ 署名の検証だけで済ませず、必ず DB を読む（出品者の停止などを即座に反映するため）。
 */
export async function currentStoreUser(): Promise<StoreUser | null> {
  if (!supabaseAdmin) return null

  const raw = (await cookies()).get(STORE_SESSION_COOKIE)?.value
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) return null
  const [miraiidUserId, expiresRaw, signature] = parts

  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null
  if (!/^[0-9a-f-]{36}$/i.test(miraiidUserId)) return null

  const expected = sign(miraiidUserId, expiresAt)
  // ⚠ === で比べない。掛かった時間から正解が漏れる
  const a = Buffer.from(signature, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  const { data: identity } = await supabaseAdmin
    .from('store_identities')
    .select('customer_id, customers(id, email, name)')
    .eq('miraiid_user_id', miraiidUserId)
    .maybeSingle()
  const customer = identity?.customers as unknown as { id: string; email: string; name: string } | null
  if (!identity || !customer) return null

  const { data: seller } = await supabaseAdmin
    .from('store_sellers')
    .select('id, status, display_name, slug')
    .eq('customer_id', customer.id)
    .maybeSingle()

  return {
    miraiidUserId,
    customerId: customer.id,
    email: customer.email,
    name: customer.name,
    seller: seller
      ? { id: seller.id, status: seller.status as SellerStatus, displayName: seller.display_name, slug: seller.slug }
      : null,
  }
}

/** API 用。ログインしていなければ 401 を返す */
export async function requireStoreUser(): Promise<{ user: StoreUser } | { denied: Response }> {
  const user = await currentStoreUser()
  if (!user) return { denied: NextResponse.json({ error: 'ログインしてください' }, { status: 401 }) }
  return { user }
}

/** API 用。承認済みの出品者でなければ 401/403 を返す */
export async function requireApprovedSeller(): Promise<
  { user: StoreUser & { seller: NonNullable<StoreUser['seller']> } } | { denied: Response }
> {
  const result = await requireStoreUser()
  if ('denied' in result) return result
  const { user } = result
  if (!user.seller || user.seller.status !== 'approved') {
    return { denied: NextResponse.json({ error: '出品者として承認されていません' }, { status: 403 }) }
  }
  return { user: user as StoreUser & { seller: NonNullable<StoreUser['seller']> } }
}
