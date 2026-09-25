import 'server-only'
import { MIRAIID_SUPABASE_ANON_KEY, MIRAIID_SUPABASE_URL, miraiidConfigured } from './miraiid-config'

export interface MiraiidUser {
  id: string
  email: string
  name: string | null
}

/**
 * ブラウザから送られた MiraiID のアクセストークンを、MiraiID 側に問い合わせて確かめる。
 * 確かめられたら本人の情報を返す。
 *
 * ⚠ トークンの中身（JWT）を自分で読んで信じない。MiraiID に問い合わせる
 *   （失効・削除されたユーザーを弾くため）。
 * ⚠ メールが確認済みの人しか通さない。この後メールアドレスで customers 行に
 *   紐づけるので、確認前のメールを信じると他人の購入履歴に入れてしまう。
 */
export async function verifyMiraiidToken(accessToken: unknown): Promise<MiraiidUser | null> {
  if (!miraiidConfigured()) return null
  if (typeof accessToken !== 'string' || accessToken.length < 20 || accessToken.length > 8192) return null

  let res: Response
  try {
    res = await fetch(`${MIRAIID_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: MIRAIID_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (err) {
    console.error('[miraiid] user lookup failed:', err)
    return null
  }
  if (!res.ok) return null

  const user = (await res.json()) as {
    id?: string
    email?: string
    email_confirmed_at?: string | null
    user_metadata?: { full_name?: string; name?: string }
  }
  if (!user.id || !user.email || !user.email_confirmed_at) return null

  return {
    id: user.id,
    email: user.email.trim().toLowerCase(),
    name: user.user_metadata?.full_name || user.user_metadata?.name || null,
  }
}
