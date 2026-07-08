// リッチテキスト (rich_description / blog content) 内の <img> を最適化する。
// エディタ出力の生 <img> は next/image を通らず Supabase Storage の原寸画像
// （数MBのPNGもある）をそのまま配信してしまうため、サーバーレンダリング時に
// Netlify Image CDN (/_next/image) 経由の URL に書き換え、遅延読み込みを付与する。

// /_next/image の `w` は next.config images の deviceSizes/imageSizes に
// 含まれる値のみ許可される（それ以外は 400）
const SRCSET_WIDTHS = [640, 1080, 1920]
const DEFAULT_WIDTH = 1080
const QUALITY = 75

const SUPABASE_IMAGE_URL = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\//i

export function optimizeRichContentImages(html: string | null | undefined): string {
  if (!html || !html.includes('<img')) return html || ''

  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/\ssrc=["']([^"']+)["']/i)
    if (!srcMatch) return tag

    const src = srcMatch[1]
    if (!SUPABASE_IMAGE_URL.test(src)) {
      // Supabase 以外（remotePatterns 未許可の可能性）は URL を触らず lazy 化のみ
      return withLazyAttrs(tag)
    }

    // 旧 optimizeImageUrl が付けた変換クエリ（object endpoint では無視される）は落とす
    const cleanSrc = src.split('?')[0]
    const encoded = encodeURIComponent(cleanSrc)
    // HTML 属性値なので & は &amp; にエスケープする
    const optimizedSrc = `/_next/image?url=${encoded}&amp;w=${DEFAULT_WIDTH}&amp;q=${QUALITY}`
    const srcset = SRCSET_WIDTHS
      .map((w) => `/_next/image?url=${encoded}&amp;w=${w}&amp;q=${QUALITY} ${w}w`)
      .join(', ')

    const replaced = tag.replace(
      srcMatch[0],
      ` src="${optimizedSrc}" srcset="${srcset}" sizes="(max-width: 1024px) 100vw, 66vw"`
    )
    return withLazyAttrs(replaced)
  })
}

function withLazyAttrs(tag: string): string {
  let out = tag
  if (!/\sloading=/i.test(out)) out = out.replace(/^<img/i, '<img loading="lazy"')
  if (!/\sdecoding=/i.test(out)) out = out.replace(/^<img/i, '<img decoding="async"')
  return out
}
