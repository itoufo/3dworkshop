import type { Workshop } from '@/types'

/**
 * GA4 (gtag.js) 計測ヘルパー。
 *
 * gtag スニペットは app/layout.tsx の <head> で読み込まれる。ここではその
 * グローバル `window.gtag` にイベントを送る薄いラッパーだけを提供する。
 * SSR / gtag 未ロード時は no-op なので、どのクライアントコンポーネントから
 * 呼んでも安全。
 */

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-HWRY2Z7G7N'

export const GA_CURRENCY = 'JPY'

/** GA4 ecommerce の items 要素 */
export interface GaItem {
  item_id: string
  item_name: string
  item_category?: string
  price?: number
  quantity?: number
}

/**
 * 任意の GA4 イベントを送信する。gtag 未ロード / SSR では何もしない。
 */
export function gaEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}

/**
 * Workshop を GA4 の items 要素へ変換する。
 */
export function gaWorkshopItem(workshop: Workshop, quantity = 1): GaItem {
  const item: GaItem = {
    item_id: workshop.id,
    item_name: workshop.title,
    price: workshop.price,
    quantity,
  }
  if (workshop.category?.name) item.item_category = workshop.category.name
  return item
}
