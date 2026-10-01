/**
 * 3DLab スクール 入会金無料キャンペーン
 *
 * 終了日を決めず常設で続け、表記は「今月末まで」にしている。
 * 月ごとに日付を書き換えなくて済むようにするため（2026-10 に変更）。
 *
 * 終了するときは isEnrollmentFeeCampaignActive を false にして再デプロイする。
 * /school と /school/apply は静的プリレンダリングなので、再デプロイしないと
 * 初期HTMLにキャンペーン表示が残る。
 */

/** 通常の入会金（税込）。税別 20,000 円 + システム登録料 */
export const REGULAR_REGISTRATION_FEE = 22000

/** 画面・メール文面に出す終了日の表記 */
export const CAMPAIGN_END_LABEL = '今月末'

/** キャンペーン期間中かどうか */
export function isEnrollmentFeeCampaignActive(): boolean {
  return true
}

/** 現在適用される入会金（税込） */
export function getRegistrationFee(): number {
  return isEnrollmentFeeCampaignActive() ? 0 : REGULAR_REGISTRATION_FEE
}
