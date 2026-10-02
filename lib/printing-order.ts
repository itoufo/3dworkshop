/**
 * 3Dプリント制作依頼の選択肢と料金。依頼フォーム（表示）と依頼 API（依頼行に書く金額）の両方がここから取る。
 * ⚠ 金額を画面側だけに持たせない。依頼行と確認メールに書く金額はサーバーがここで計算する。
 */

// サイズ定義
export const PRINT_SIZES = [
  { value: 'S', label: 'Sサイズ', dimension: '5cm', basePrice1: 5000, basePrice100: 3000, basePrice1000: 2000 },
  { value: 'M', label: 'Mサイズ', dimension: '10cm', basePrice1: 7500, basePrice100: 4500, basePrice1000: 3000 },
  { value: 'L', label: 'Lサイズ', dimension: '15cm', basePrice1: 10000, basePrice100: 6000, basePrice1000: 4000 },
] as const

export type PrintSize = (typeof PRINT_SIZES)[number]
export type PrintSizeValue = PrintSize['value']

// フィラメント定義
export const PRINT_MATERIALS = [
  { value: 'PLA', label: 'PLA', description: '標準・初心者向け' },
  { value: 'TPU', label: 'TPU', description: '柔軟性あり' },
  { value: 'ABS', label: 'ABS', description: '耐熱・耐衝撃' },
] as const

// 色定義
export const PRINT_COLORS = [
  { value: 'white', label: 'ホワイト', hex: '#FFFFFF' },
  { value: 'black', label: 'ブラック', hex: '#1a1a1a' },
  { value: 'custom', label: 'その他（特注）', hex: null },
] as const

/** 基本料金（円） */
export const PRINT_BASE_COST = 5000
/** 送料（円）。送料無料 */
export const PRINT_SHIPPING_COST = 0
/** 1回の依頼で受ける個数の上限（フォームの入力欄の上限） */
export const PRINT_MAX_QUANTITY = 1000

// 数量による単価計算（対数スケール）
export function calculateUnitPrice(quantity: number, size: PrintSize): number {
  if (quantity <= 1) return size.basePrice1
  if (quantity >= 1000) return size.basePrice1000

  // 対数補間: price = base1 - (log10(qty) / log10(1000)) * (base1 - base1000)
  const logQty = Math.log10(quantity)
  const logMax = Math.log10(1000)
  const ratio = logQty / logMax
  const unitPrice = size.basePrice1 - ratio * (size.basePrice1 - size.basePrice1000)

  return Math.round(unitPrice)
}

/** 料金の内訳（単価・造形費・合計） */
export function calculatePrintingCost(quantity: number, size: PrintSize) {
  const unitPrice = calculateUnitPrice(quantity, size)
  const materialCost = unitPrice * quantity
  return {
    unitPrice,
    materialCost,
    baseCost: PRINT_BASE_COST,
    shippingCost: PRINT_SHIPPING_COST,
    totalCost: PRINT_BASE_COST + materialCost + PRINT_SHIPPING_COST,
  }
}
