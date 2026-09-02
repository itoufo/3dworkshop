/**
 * 商品メディア（写真・動画）の判別。
 * products.media_urls は写真と動画を表示順のまま1本の配列で持つため、
 * 拡張子でどちらかを見分ける（アップロード時にファイル名の拡張子を保つ前提）。
 */

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v'] as const

/** 商品ページ・管理画面でアップロードを許可するファイル */
export const ACCEPTED_MEDIA_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const

/** 1ファイルの上限（50MB）。Supabase の product-media バケットの上限と揃えている */
export const MAX_MEDIA_FILE_SIZE = 50 * 1024 * 1024

export function isVideoUrl(url: string): boolean {
  const path = url.split('?')[0].toLowerCase()
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext))
}

export function isVideoFile(file: { type: string; name: string }): boolean {
  return file.type.startsWith('video/') || isVideoUrl(file.name)
}

/** 一覧のサムネイルや SNS シェア画像に使う「最初の写真」。動画しかなければ null */
export function firstImageUrl(mediaUrls: string[] | null | undefined): string | null {
  return (mediaUrls ?? []).find((url) => !isVideoUrl(url)) ?? null
}

/** 写真だけを抜き出す（構造化データの image など、動画を渡せない場所用） */
export function imageUrlsOnly(mediaUrls: string[] | null | undefined): string[] {
  return (mediaUrls ?? []).filter((url) => !isVideoUrl(url))
}
