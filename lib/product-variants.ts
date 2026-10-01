/**
 * シリーズの子商品を「軸ごとの値」で選ぶための計算。DB には触れない（ブラウザでも使う）。
 *
 * 子商品は products の1行で、variant_options に { 軸名: 値 } を持つ。
 * 例: 軸 ['動物', 'サイズ'] に対して { 動物: 'ねこ', サイズ: '高さ約10cm' }
 */
import type { Product } from '@/lib/products'

export type Selection = Record<string, string>

/** 「ねこ / 高さ約10cm」のような表示名 */
export function variantLabel(item: Pick<Product, 'variant_options'>, axes: string[]): string {
  return axes
    .map((axis) => item.variant_options?.[axis])
    .filter((value): value is string => Boolean(value))
    .join(' / ')
}

/** 軸ごとの選択肢。並びは子商品の並び順（series_sort）で最初に出てきた順 */
export function axisValues(items: Pick<Product, 'variant_options'>[], axes: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const axis of axes) {
    const seen: string[] = []
    for (const item of items) {
      const value = item.variant_options?.[axis]
      if (value && !seen.includes(value)) seen.push(value)
    }
    result[axis] = seen
  }
  return result
}

function matches(item: Pick<Product, 'variant_options'>, selection: Selection, axes: string[]): boolean {
  return axes.every((axis) => !selection[axis] || item.variant_options?.[axis] === selection[axis])
}

/** 選択にぴったり合う子商品。無ければ null */
export function findItem<T extends Pick<Product, 'variant_options'>>(
  items: T[],
  axes: string[],
  selection: Selection,
): T | null {
  return items.find((item) => axes.every((axis) => item.variant_options?.[axis] === selection[axis])) ?? null
}

/** いまの選択のまま、ある軸だけ value に変えたときに子商品があるか */
export function isAvailable(
  items: Pick<Product, 'variant_options'>[],
  axes: string[],
  selection: Selection,
  axis: string,
  value: string,
): boolean {
  return items.some((item) => matches(item, { ...selection, [axis]: value }, axes))
}

/**
 * ある軸の値を選んだときの次の選択。
 * その組み合わせが無ければ、選んだ値は保ったまま、他の軸を「今の選択に一番近い」子商品に合わせる
 * （存在しない組み合わせで止まらないようにする）。
 */
export function selectValue<T extends Pick<Product, 'variant_options'>>(
  items: T[],
  axes: string[],
  selection: Selection,
  axis: string,
  value: string,
): Selection {
  const wanted = { ...selection, [axis]: value }
  if (findItem(items, axes, wanted)) return wanted

  const candidates = items.filter((item) => item.variant_options?.[axis] === value)
  if (candidates.length === 0) return selection
  const score = (item: T) => axes.filter((a) => item.variant_options?.[a] === wanted[a]).length
  const best = candidates.reduce((a, b) => (score(b) > score(a) ? b : a))
  return selectionOf(best, axes)
}

export function selectionOf(item: Pick<Product, 'variant_options'>, axes: string[]): Selection {
  const selection: Selection = {}
  for (const axis of axes) {
    const value = item.variant_options?.[axis]
    if (value) selection[axis] = value
  }
  return selection
}

/** 一覧カードの「¥1,980〜」用 */
export function lowestPrice(items: Pick<Product, 'base_price'>[]): number | null {
  if (items.length === 0) return null
  return Math.min(...items.map((item) => item.base_price))
}
