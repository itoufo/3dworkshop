import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 回数制限。
 *
 * ⚠ 数える相手（IP）を、クライアントが名乗った値から取らないこと。
 *   `x-forwarded-for` の左端は「クライアントが好きに書ける欄」で、
 *   1リクエストごとに別人を名乗れば制限は素通しになる（2026-08-31 のレビューで指摘）。
 *
 * ⚠ プロセス内の Map だけで数えないこと。サーバーレス関数はインスタンスが増減するので、
 *   実際の上限は「インスタンス数 × 上限」になり、コールドスタートで 0 に戻る。
 *   本当の上限は DB（public.rate_limit）で持つ。
 *
 * 二段構え:
 *   1. プロセス内で数える … DB への往復を減らすための前段。ここで超えたら即弾く
 *      （プロセス内の数は全体の数以下なので、ここで超えていれば全体でも超えている）
 *   2. DB で数える … こちらが本当の上限
 */

/**
 * CDN が自分で付ける「実際に接続してきた相手のIP」。⚠ クライアントは書き換えられない。
 *   x-vercel-forwarded-for    … Vercel。x-forwarded-for と同じ値だが、Vercel の手前に
 *                               別のプロキシを置いても上書きされない
 *   x-nf-client-connection-ip … Netlify
 *   cf-connecting-ip          … Cloudflare
 */
const TRUSTED_IP_HEADERS = [
  'x-vercel-forwarded-for',
  'x-nf-client-connection-ip',
  'cf-connecting-ip',
]

/**
 * 数える単位にする接続元。
 *
 * ⚠ `x-forwarded-for` を使うときは**右端**を取る。左端はクライアントが書いた値、
 *   右端が「自分の手前のプロキシが見た接続元」で、いちばん詐称しにくい。
 */
export function clientIp(headers: Headers): string {
  for (const name of TRUSTED_IP_HEADERS) {
    const v = headers.get(name)?.trim()
    if (v) return v
  }
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const hops = xff.split(',').map((s) => s.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  // ローカル開発などヘッダが無い場合。⚠ 全員が同じ枠を共有することになる
  return 'unknown'
}

// ---- 前段: プロセス内 ----

const hits = new Map<string, number[]>()
/** ⚠ 上限を必ず持たせる。持たせないと、詐称された鍵が増え続けてメモリを食う */
const MAX_TRACKED_KEYS = 2000

function tooManyLocal(key: string, windowMs: number, max: number): boolean {
  const now = Date.now()
  const list = (hits.get(key) || []).filter((t) => now - t < windowMs)
  list.push(now)

  // 入れ直して「最近使った順」の末尾へ回す（Map は挿入順を保つ）
  hits.delete(key)
  hits.set(key, list)

  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < windowMs)) hits.delete(k)
    }
    // ⚠ 期限切れの掃除だけでは減らないことがある（全部が「最近」のとき）。
    //   その場合は古い順に捨てて、必ず上限内に収める
    while (hits.size > MAX_TRACKED_KEYS) {
      const oldest = hits.keys().next()
      if (oldest.done) break
      hits.delete(oldest.value)
    }
  }

  return list.length > max
}

// ---- 本体 ----

export type RateLimitOptions = {
  /** 窓の長さ（ミリ秒） */
  windowMs: number
  /** 窓の中で許す回数 */
  max: number
}

/**
 * 1回数えて、上限を超えていたら true。
 *
 * ⚠ DB が落ちているときは通す（false）。問い合わせ窓口を DB 障害で全部閉じるより、
 *   前段のプロセス内の制限だけで凌ぐほうがましだと判断している。
 */
export async function tooManyRequests(key: string, { windowMs, max }: RateLimitOptions): Promise<boolean> {
  if (tooManyLocal(key, windowMs, max)) return true

  if (!supabaseAdmin) return false

  const { data, error } = await supabaseAdmin.rpc('bump_rate_limit', {
    p_key: key,
    p_window_seconds: Math.ceil(windowMs / 1000),
    p_max: max,
  })

  if (error) {
    // 42883 = 関数が無い（migration 未適用）。落とさずに前段だけで凌ぐ
    console.error('[rate-limit] bump_rate_limit', error.code, error.message)
    return false
  }

  return data === true
}
