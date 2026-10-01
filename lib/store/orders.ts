import 'server-only'
import { randomBytes } from 'crypto'

/**
 * ストアの注文まわりの決まりごと（決済・Webhook・ダウンロード・管理画面で共通）。
 */

/** データ購入のダウンロード期限（日） */
export const STORE_DOWNLOAD_VALID_DAYS = 30
/** データ購入のダウンロード回数の上限 */
export const STORE_DOWNLOAD_MAX_COUNT = 20
/** ダウンロード用に発行する署名付き URL の寿命（秒）。リンクを転送されても使い回せないよう短くする */
export const STORE_SIGNED_URL_SECONDS = 60

/** ダウンロード用の合言葉。URL に入るのでログイン無しの本人確認を兼ねる。推測できない長さにする */
export function createStoreDownloadToken(): string {
  return randomBytes(32).toString('base64url')
}

export type StoreOrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled' | 'refunded'

export const STORE_ORDER_STATUS_LABEL: Record<StoreOrderStatus, string> = {
  pending: '決済待ち',
  paid: '支払い済み',
  shipped: '発送済み',
  cancelled: 'キャンセル',
  refunded: '返金済み',
}

export const STORE_KIND_LABEL = { data: '3D データ', print: '完成品' } as const
