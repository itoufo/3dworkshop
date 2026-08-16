import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

/**
 * 管理画面の API を守るためのセッション。
 *
 * ⚠ 既存の `admin_auth` cookie はブラウザ側で `Cookies.set('admin_auth', 'true')` している。
 *   つまり誰でも DevTools から偽造できる。ページの出し分けには十分でも、
 *   「書き込める API」の鍵にはならない。
 *   chat_knowledge の中身はそのまま LLM の system プロンプトに入る＝
 *   書けた人が公開サイトのボットの発言を決められるので、ここは別の鍵で守る。
 *
 * 仕組み: /api/auth でパスワードが合ったとき、サーバーが httpOnly の `admin_session` を配る。
 *   値は `<失効時刻>.<HMAC>`。鍵は ADMIN_PASSWORD そのもの（別の秘密を増やさない）。
 *   - httpOnly なので JS からは作れない
 *   - HMAC なので中身を書き換えると壊れる
 *   - 失効時刻が署名対象に入っているので、期限を延ばすこともできない
 *   - ADMIN_PASSWORD を変えると既存のセッションは全部無効になる
 *
 * ⚠ 既存の `admin_auth` は消していない。/admin のログイン画面と /api/revalidate が
 *   今も使っているため。両方に手を入れるのは別の変更として切り出す。
 */

const COOKIE_NAME = 'admin_session'
const TTL_MS = 24 * 60 * 60 * 1000 // 1日。/admin の admin_auth cookie と揃える

function sign(expiresAt: number, secret: string): string {
  return createHmac('sha256', secret).update(String(expiresAt)).digest('hex')
}

/** ログイン成功時に配る cookie の値 */
export function issueAdminSession(secret: string): { name: string; value: string; maxAge: number } {
  const expiresAt = Date.now() + TTL_MS
  return {
    name: COOKIE_NAME,
    value: `${expiresAt}.${sign(expiresAt, secret)}`,
    maxAge: Math.floor(TTL_MS / 1000),
  }
}

/**
 * 管理者として通してよいか。
 * ⚠ 呼び出し側で必ず結果を見て弾くこと。true を返す条件をここ以外に作らない。
 */
export async function isAdminRequest(): Promise<boolean> {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) return false // 未設定なら誰も通さない（開けっ放しにしない）

  const raw = (await cookies()).get(COOKIE_NAME)?.value
  if (!raw) return false

  const [expiresRaw, mac] = raw.split('.')
  const expiresAt = Number(expiresRaw)
  if (!expiresAt || !mac || Number.isNaN(expiresAt)) return false
  if (Date.now() > expiresAt) return false

  const expected = sign(expiresAt, secret)
  // ⚠ === で比べない。文字列比較は先頭から順に見るので、掛かった時間で正解が漏れる
  const a = Buffer.from(mac, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** 通らなければ 401 の Response を返す。通れば null */
export async function requireAdmin(): Promise<Response | null> {
  if (await isAdminRequest()) return null
  return Response.json(
    { error: 'unauthorized', message: '管理画面にログインし直してください。' },
    { status: 401 },
  )
}
