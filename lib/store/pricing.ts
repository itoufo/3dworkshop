/**
 * ストアの手数料と出品者の取り分。値はここ1箇所だけに置く。
 *
 *   データ販売 … 3dlab 60% / 出品者 40%
 *   印刷販売   … 3dlab 80% / 出品者 20%（印刷・発送は 3dlab が行う）
 *
 * ⚠ 注文には購入時点の取り分を保存する（store_orders.seller_amount）。
 *   ここを変えても、過去の注文の取り分は変わらない。
 */
export type StoreOrderKind = 'data' | 'print'

/** 出品者の取り分（%）。⚠ 整数で持つ。0.4 のような小数で掛けると誤差で1円少なくなることがある */
export const SELLER_SHARE_PERCENT: Record<StoreOrderKind, number> = {
  data: 40,
  print: 20,
}

/** 価格を 3dlab の手数料と出品者の取り分に分ける。1円未満は出品者側を切り捨てる */
export function splitPrice(kind: StoreOrderKind, price: number): { platformFee: number; sellerAmount: number } {
  const sellerAmount = Math.floor((price * SELLER_SHARE_PERCENT[kind]) / 100)
  return { platformFee: price - sellerAmount, sellerAmount }
}
