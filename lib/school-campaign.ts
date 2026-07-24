/**
 * 3DLab スクール 入会金無料キャンペーン
 *
 * 期間: 〜2026年9月30日（JST）
 *
 * 【重要】/school と /school/apply は静的プリレンダリング（○ Static）のため、
 * サーバー側HTMLの判定はビルド時点の日付で固定される。ブラウザ側では読み込み時に
 * 再評価されるため実際の請求額・表示は最終的に正しくなるが、期間終了後に
 * 再デプロイしないと初期表示が一瞬キャンペーン表示のままになる。
 * → 終了・延長のタイミングでは必ず再デプロイすること。
 *
 * 延長する場合は CAMPAIGN_END / CAMPAIGN_END_LABEL の両方を更新する。
 */

/** 通常の入会金（税込）。税別 20,000 円 + システム登録料 */
export const REGULAR_REGISTRATION_FEE = 22000

/** キャンペーン終了の境界（JST 2026-09-30 23:59:59 の直後） */
const CAMPAIGN_END = new Date('2026-10-01T00:00:00+09:00')

/** 画面・メール文面に出す終了日の表記 */
export const CAMPAIGN_END_LABEL = '2026年9月30日'

/** キャンペーン期間中かどうか */
export function isEnrollmentFeeCampaignActive(now: Date = new Date()): boolean {
  return now.getTime() < CAMPAIGN_END.getTime()
}

/** 現在適用される入会金（税込） */
export function getRegistrationFee(now: Date = new Date()): number {
  return isEnrollmentFeeCampaignActive(now) ? 0 : REGULAR_REGISTRATION_FEE
}
