/**
 * ストアの作品の「完成品の選択肢」（サイズ・色など）。DB には触れない（ブラウザでも使う）。
 *
 * 作品は option_axes（選ぶ項目の名前）と print_variants（組み合わせごとの価格）を持つ。
 * 選ぶ計算は本サイトのシリーズと同じ lib/product-variants.ts を使う。
 * ⚠ 選択肢は完成品だけ。3D データはサイズや色で変わらないので、データの価格は作品に1つ。
 */
import { PRICE_MAX, PRICE_MIN } from './product-rules'

export interface StoreVariant {
  /**
   * 注文・カートが指す目印。⚠ 組み合わせ（項目の値）に結びつく。同じ組み合わせなら編集しても変えず、
   * 違う組み合わせには必ず別の id を振る（カートの行が、いつの間にか別の品物を指さないように）
   */
  id: string
  options: Record<string, string>
  price: number
}

export const VARIANT_AXES_MAX = 3
export const VARIANTS_MAX = 30
export const VARIANT_AXIS_NAME_MAX = 20
export const VARIANT_VALUE_MAX = 30

export function newVariantId(): string {
  // ⚠ randomUUID は https か localhost でしか使えない（LAN の http で確かめるときに落ちる）
  const bytes = new Uint8Array(6)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 項目名に使えない名前（オブジェクトの仕組みの名前と重なり、値が消える） */
const RESERVED_AXIS_NAMES = new Set(['__proto__', 'constructor', 'prototype'])

/** 改行・タブなどは名前に入れない（メールの件名・Stripe の品名にそのまま出る） */
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

function combinationKey(options: Record<string, string>, axes: string[]): string {
  return JSON.stringify(axes.map((a) => options[a]))
}

/** 出品者の編集画面で持つ組み合わせ。値は項目の並び順で持つ（項目名を書き換えても値がずれないように） */
export type EditableVariant = { id: string; values: string[]; price: string }

/** DB の形（項目名→値）から編集画面の形へ。⚠ サーバーのページからも呼ぶので、画面の部品のファイルに置かない */
export function toEditableVariants(axes: string[], variants: StoreVariant[]): EditableVariant[] {
  return variants.map((v) => ({ id: v.id, values: axes.map((a) => v.options[a] ?? ''), price: String(v.price) }))
}

/** lib/product-variants.ts の関数に渡す形 */
export function asVariantItems(variants: StoreVariant[]): (StoreVariant & { variant_options: Record<string, string> })[] {
  return variants.map((v) => ({ ...v, variant_options: v.options }))
}

/** 「高さ約7cm / 白」のような表示名 */
export function variantName(variant: Pick<StoreVariant, 'options'>, axes: string[]): string {
  return axes
    .map((axis) => variant.options[axis])
    .filter(Boolean)
    .join(' / ')
}

/** 選択肢を使っている作品か */
export function hasVariants(product: { option_axes: string[]; print_variants: StoreVariant[] }): boolean {
  return product.option_axes.length > 0 && product.print_variants.length > 0
}

/** 完成品の価格の幅（一覧の「¥1,980〜」・JSON-LD 用）。完成品を売っていなければ null */
export function printPriceRange(product: {
  sell_print: boolean
  print_price: number | null
  option_axes: string[]
  print_variants: StoreVariant[]
}): { min: number; max: number } | null {
  if (!product.sell_print) return null
  if (hasVariants(product)) {
    const prices = product.print_variants.map((v) => v.price)
    return { min: Math.min(...prices), max: Math.max(...prices) }
  }
  return product.print_price == null ? null : { min: product.print_price, max: product.print_price }
}

/**
 * 出品者が送ってきた選択肢を確かめる（API の最終判定。画面のチェックは親切のため）。
 * 選択肢を使わないなら axes も variants も空で返す。
 */
export function parseVariantsInput(
  rawAxes: unknown,
  rawVariants: unknown,
  /** 保存済みの組み合わせ。同じ組み合わせの id を引き継ぐ */
  previous: StoreVariant[] = [],
  previousAxes: string[] = [],
): { axes: string[]; variants: StoreVariant[] } | { error: string } {
  const axesIn = Array.isArray(rawAxes) ? rawAxes : []
  const axes: string[] = []
  for (const a of axesIn) {
    const name = typeof a === 'string' ? a.trim() : ''
    if (!name) continue
    if (RESERVED_AXIS_NAMES.has(name)) return { error: `「${name}」は項目の名前に使えません` }
    if (CONTROL_CHARS.test(name)) return { error: '項目の名前に改行は入れられません' }
    if (name.length > VARIANT_AXIS_NAME_MAX) return { error: `選ぶ項目の名前は${VARIANT_AXIS_NAME_MAX}文字までです` }
    if (axes.includes(name)) return { error: `選ぶ項目「${name}」が重なっています` }
    axes.push(name)
  }
  if (axes.length > VARIANT_AXES_MAX) return { error: `選ぶ項目は${VARIANT_AXES_MAX}つまでです` }
  // 選択肢を使うつもりで項目名を書き忘れた（空の名前だけが届いた）
  if (axes.length === 0 && axesIn.length > 0) return { error: '選ぶ項目の名前（例: サイズ）を入れてください' }
  if (axes.length === 0) return { axes: [], variants: [] }

  // 保存済みの組み合わせ → id。値の並び（項目の順）で突き合わせるので、項目名を書き換えただけなら id は変わらない。
  // 項目の数が変わったら別の品物として振り直す。値を書き換えた組み合わせも新しい id（カートの行は「選び直して」になる）
  const previousIds = new Map<string, string>()
  if (previousAxes.length === axes.length) {
    for (const v of previous) {
      if (v && typeof v.id === 'string' && v.options) previousIds.set(combinationKey(v.options, previousAxes), v.id)
    }
  }

  const variantsIn = Array.isArray(rawVariants) ? rawVariants : []
  if (variantsIn.length === 0) return { error: '組み合わせを1つ以上入れてください' }
  if (variantsIn.length > VARIANTS_MAX) return { error: `組み合わせは${VARIANTS_MAX}個までです` }

  const variants: StoreVariant[] = []
  const seenKeys = new Set<string>()
  const seenIds = new Set<string>()
  for (const raw of variantsIn) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as { options?: unknown; price?: unknown }
    const optsIn = (r.options && typeof r.options === 'object' ? r.options : {}) as Record<string, unknown>
    const options: Record<string, string> = {}
    for (const axis of axes) {
      const value = typeof optsIn[axis] === 'string' ? (optsIn[axis] as string).trim() : ''
      if (!value) return { error: `組み合わせの「${axis}」が空です` }
      if (value.length > VARIANT_VALUE_MAX) return { error: `「${axis}」の値は${VARIANT_VALUE_MAX}文字までです` }
      if (CONTROL_CHARS.test(value)) return { error: `「${axis}」の値に改行は入れられません` }
      options[axis] = value
    }
    const key = combinationKey(options, axes)
    if (seenKeys.has(key)) return { error: `同じ組み合わせが2つあります（${variantName({ options }, axes)}）` }
    seenKeys.add(key)

    const price = typeof r.price === 'number' ? r.price : Number(r.price)
    if (!Number.isInteger(price) || price < PRICE_MIN || price > PRICE_MAX) {
      return { error: `「${variantName({ options }, axes)}」の価格は ${PRICE_MIN}〜${PRICE_MAX.toLocaleString()} 円の整数で入れてください` }
    }
    // ⚠ id はブラウザの値を使わず、保存済みの同じ組み合わせから引き継ぐ。無ければ新しく振る。
    //   行の値を書き換えて別の組み合わせにしたら、id も変わる（カートの行が別の品物を指さない）
    let id = previousIds.get(key) ?? newVariantId()
    if (seenIds.has(id)) id = newVariantId()
    seenIds.add(id)
    variants.push({ id, options, price })
  }
  return { axes, variants }
}

/**
 * 「どの作品を・どの買い方で・どの組み合わせで」から価格を決める。決済（1点・カート）の唯一の出どころ。
 * ⚠ 価格はブラウザから受け取らない。ここで作品の値から決める。
 */
export function resolveOffer(
  product: {
    sell_data: boolean
    data_price: number | null
    sell_print: boolean
    print_price: number | null
    option_axes: string[]
    print_variants: StoreVariant[]
  },
  kind: 'data' | 'print',
  variantId: unknown,
): { price: number; variantId: string | null; variantLabel: string | null } | { error: string } {
  if (kind === 'data') {
    if (!product.sell_data || product.data_price == null) return { error: 'この作品はデータでは販売していません' }
    return { price: product.data_price, variantId: null, variantLabel: null }
  }
  if (!product.sell_print) return { error: 'この作品は完成品では販売していません' }
  if (hasVariants(product)) {
    const variant = product.print_variants.find((v) => v.id === variantId)
    if (!variant) return { error: '選んだ組み合わせが見つかりません。ページを読み込み直してください' }
    return { price: variant.price, variantId: variant.id, variantLabel: variantName(variant, product.option_axes) }
  }
  if (product.print_price == null) return { error: 'この作品は完成品では販売していません' }
  return { price: product.print_price, variantId: null, variantLabel: null }
}
