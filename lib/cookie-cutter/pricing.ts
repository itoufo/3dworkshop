/**
 * クッキー型の価格。ここを変えれば購入画面・Stripe・メールのすべてに反映される。
 */

/** STLファイルのダウンロード（データのみ） */
export const CUTTER_DOWNLOAD_PRICE = 300

/**
 * こちらで印刷して発送する。送料込みの金額。
 * ⚠ 送料は lib/shipping.ts の SHIPPING_FEE が別に足される。
 *   いまは 0（全国一律で送料無料）なので、お客様が払うのはこの金額ちょうど。
 *   SHIPPING_FEE を 0 以外にすると「送料込み」でなくなるので、そのときはここも見直すこと。
 */
export const CUTTER_PRINT_PRICE = 3000

export type CutterOrderKind = 'download' | 'print'

export function cutterUnitPrice(kind: CutterOrderKind): number {
  return kind === 'print' ? CUTTER_PRINT_PRICE : CUTTER_DOWNLOAD_PRICE
}

/** ダウンロードリンクの有効期間（日数） */
export const DOWNLOAD_VALID_DAYS = 30

/** 1つの注文でダウンロードできる回数の上限 */
export const DOWNLOAD_MAX_COUNT = 20
