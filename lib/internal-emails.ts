/**
 * 内部・テスト用の識別子（オーナー / 身内 / 動作確認テスト）。
 * 集計を汚染するので、統計・CV計算から除外して「実顧客だけ」を見えるようにする。
 *
 * - メール: 予約統計・コンバージョン計算から除外（isInternalEmail）
 * - IP:     GA4「内部トラフィック」除外に登録する値の控え（コードからは使わない・参照用）
 *
 * 新しいテスト用メール / IP を使ったら、ここに追記する。
 */

// GA4 の内部トラフィック除外に登録する現在のグローバルIP（変わったら更新）
export const INTERNAL_IPS = ['152.165.126.35'] as const

// 過去にテスト/内部で使われたメール（完全一致・小文字比較）
export const INTERNAL_EMAILS = [
  'itoyuho73@gmail.com',            // オーナー本人
  'yuho.ito@walker.co.jp',          // オーナー（会社）
  'su@gmail',                       // 不正メール（テスト）
  'test@gmail.com',                 // テスト
  'sy19970911@gail.com',            // "gail" タイポ（テスト）
  'sy19970911@gmail.com',           // 身内
  'love.tennis.911@softbank.ne.jp', // 身内
] as const

// 会社ドメインは一律で内部扱い
const INTERNAL_DOMAINS = ['walker.co.jp']

const EXACT = new Set<string>(INTERNAL_EMAILS.map((e) => e.toLowerCase()))

/**
 * 内部/テストのメールなら true。
 * 明示リスト / 会社ドメイン / test系ローカル / 不正ドメイン(ドット無し) を内部とみなす。
 */
export function isInternalEmail(email?: string | null): boolean {
  if (!email) return false
  const e = email.trim().toLowerCase()
  if (!e) return false
  if (EXACT.has(e)) return true
  const at = e.lastIndexOf('@')
  if (at === -1) return true // '@' 無し = 不正 = テスト扱い
  const local = e.slice(0, at)
  const domain = e.slice(at + 1)
  if (INTERNAL_DOMAINS.includes(domain)) return true
  if (local === 'test' || local.includes('+test')) return true // test@ / foo+test@
  if (!domain.includes('.')) return true // 例: su@gmail（不正ドメイン）
  return false
}
