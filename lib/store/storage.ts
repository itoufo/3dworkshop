import 'server-only'

/**
 * 出品者がアップロードするファイルの置き場所。
 *   store-files（非公開）… 出品データ。購入者には期限つきの経路でだけ渡す
 *   store-media（公開）  … 商品画像・アイコン
 * どちらも `sellers/<出品者ID>/` の下に置く。保存時にこの接頭辞で「本人がアップロードしたもの」かを確かめる。
 */
export const STORE_FILES_BUCKET = 'store-files'
export const STORE_MEDIA_BUCKET = 'store-media'

export function sellerPrefix(sellerId: string): string {
  return `sellers/${sellerId}/`
}

/** 公開画像の URL の頭。これで始まり、本人の接頭辞の下にあるものだけ受け付ける */
export function storeMediaPublicBase(): string {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  return `${url}/storage/v1/object/public/${STORE_MEDIA_BUCKET}/`
}

/** その出品者がアップロードした公開画像の URL か */
export function isOwnMediaUrl(sellerId: string, url: unknown): url is string {
  if (typeof url !== 'string' || url.length > 1000) return false
  const base = storeMediaPublicBase() + sellerPrefix(sellerId)
  if (!url.startsWith(base)) return false
  const rest = url.slice(base.length)
  // `..` や `/` を含むと、別の出品者の場所を指せてしまう
  return /^[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(rest)
}

/** その出品者がアップロードした出品データのパスか */
export function isOwnDataPath(sellerId: string, path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 300) return false
  const prefix = sellerPrefix(sellerId)
  if (!path.startsWith(prefix)) return false
  return /^[A-Za-z0-9-]+\.(stl|3mf|obj)$/.test(path.slice(prefix.length))
}
