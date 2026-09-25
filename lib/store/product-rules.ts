/**
 * 出品できる商品の決まり。画面（入力チェック）と API（最終判定）の両方がここを見る。
 * ⚠ 画面側のチェックは親切のため。守らせるのは API 側（ブラウザは何でも送れる）。
 */

export const PRODUCT_TITLE_MAX = 80
export const PRODUCT_DESCRIPTION_MAX = 4000
export const PRODUCT_PRINT_SPEC_MAX = 500
export const PRODUCT_IMAGES_MAX = 6
export const PRICE_MIN = 100
export const PRICE_MAX = 300_000

/** 出品データとして受け付ける拡張子 */
export const DATA_EXTENSIONS = ['stl', '3mf', 'obj'] as const
/** 出品データの上限（bucket store-files の file_size_limit と同じ値） */
export const DATA_MAX_BYTES = 100 * 1024 * 1024

export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
/** 画像の上限（bucket store-media の file_size_limit と同じ値） */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024

export const SELLER_NAME_MAX = 40
export const SELLER_BIO_MAX = 1000
/** 出品者ページの URL（/s/<slug>）。DB の CHECK と同じ */
export const SELLER_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

export function extensionOf(fileName: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(fileName)
  return m ? m[1].toLowerCase() : ''
}

export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived'

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  draft: '下書き',
  pending_review: '審査中',
  published: '掲載中',
  rejected: '差し戻し',
  archived: '取り下げ',
}
