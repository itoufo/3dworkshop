/**
 * 参加費の表示。0円のワークショップ（無料の特別回など）は金額ではなく「無料」と出す。
 * 「¥0」表記は「価格未設定」に見えてしまうため、表示は必ずこの関数を通す。
 */
export function formatPrice(price: number): string {
  return price > 0 ? `¥${price.toLocaleString()}` : '無料'
}

/** 決済をスキップして予約を即確定してよいワークショップか */
export function isFreePrice(price: number): boolean {
  return !price || price <= 0
}
