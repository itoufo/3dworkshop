/**
 * 物販（/products/[id]）の発送・送料の設定。
 * 商品ページ・決済・確認メールが同じ文言を出すよう、ここを唯一の出どころにする。
 */

/** 注文から発送までの最大日数 */
export const SHIPPING_LEAD_TIME_DAYS = 14

/** 商品ページ・メールに出す発送の目安 */
export const SHIPPING_LEAD_TIME_TEXT = 'ご注文から2週間以内に発送'

/** 全国一律の送料（円）。0 なら送料無料として表示し、決済明細にも載せない */
export const SHIPPING_FEE = 0

/** 送料の表示文言 */
export function shippingFeeLabel(): string {
  return SHIPPING_FEE > 0 ? `送料 ¥${SHIPPING_FEE.toLocaleString()}（全国一律）` : '送料無料（全国一律）'
}
