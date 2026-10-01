import { timingSafeEqual } from 'crypto'

/**
 * 定期実行（cron）から呼ばれたリクエストか。
 *
 * 呼び出し元は2つある。どちらも同じ CRON_SECRET を使う。
 *   - Vercel Cron … `Authorization: Bearer <CRON_SECRET>` を自分で付けてくる
 *   - GitHub Actions … `x-cron-secret` を自分で付ける（本命が落ちた日を後から拾う予備）
 *
 * ⚠ 判定はここ1箇所に置く。cron のルートごとに書き写すと、片方だけ直した状態が生まれる。
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 未設定なら誰も通さない（開けっ放しにしない）

  const bearer = request.headers.get('authorization')
  const provided =
    request.headers.get('x-cron-secret') ||
    (bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : null)
  if (!provided) return false

  // ⚠ === で比べない。文字列比較は先頭から順に見るので、掛かった時間で正解が漏れる
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
