/**
 * 管理画面から届いたシリーズの入力を検証して、DB に書く形にそろえる。
 * 作成（POST）と更新（PATCH）で同じものを使う。
 */

export const SLUG_PATTERN = /^[a-z0-9-]+$/
const MAX_AXES = 5
const MAX_MEDIA = 30

export interface SeriesInput {
  name: string
  slug: string
  description: string | null
  media_urls: string[]
  option_axes: string[]
  sort_order: number
  is_active: boolean
}

export type ParseResult = { ok: true; value: SeriesInput } | { ok: false; message: string }

export function parseSeriesInput(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') return { ok: false, message: '入力がありません' }
  const raw = body as Record<string, unknown>

  const name = typeof raw.name === 'string' ? raw.name.trim() : ''
  if (!name) return { ok: false, message: 'シリーズ名を入れてください' }

  const slug = typeof raw.slug === 'string' ? raw.slug.trim() : ''
  if (!SLUG_PATTERN.test(slug)) {
    return { ok: false, message: 'URL 用の名前（slug）は半角の小文字・数字・ハイフンだけで入れてください' }
  }

  const description =
    typeof raw.description === 'string' && raw.description.trim() ? raw.description : null

  if (!Array.isArray(raw.media_urls) || !raw.media_urls.every((u) => typeof u === 'string')) {
    return { ok: false, message: '写真・動画の指定が正しくありません' }
  }
  const media_urls = (raw.media_urls as string[]).filter((u) => /^https:\/\//.test(u))
  if (media_urls.length > MAX_MEDIA) return { ok: false, message: `写真・動画は ${MAX_MEDIA} 件までです` }

  if (!Array.isArray(raw.option_axes) || !raw.option_axes.every((a) => typeof a === 'string')) {
    return { ok: false, message: '選ぶ項目の指定が正しくありません' }
  }
  const option_axes = (raw.option_axes as string[]).map((a) => a.trim()).filter(Boolean)
  if (option_axes.length === 0) return { ok: false, message: '選ぶ項目（例: サイズ）を1つ以上入れてください' }
  if (option_axes.length > MAX_AXES) return { ok: false, message: `選ぶ項目は ${MAX_AXES} つまでです` }
  if (new Set(option_axes).size !== option_axes.length) {
    return { ok: false, message: '選ぶ項目の名前が重複しています' }
  }

  const sortRaw = Math.trunc(Number(raw.sort_order ?? 0))
  const sort_order = Number.isFinite(sortRaw) ? sortRaw : 0

  return {
    ok: true,
    value: { name, slug, description, media_urls, option_axes, sort_order, is_active: raw.is_active === true },
  }
}
