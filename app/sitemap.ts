import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://3dlab.jp'

  // 静的ページ
  const staticPages = [
    '',
    '/school',
    '/school/apply',
    '/products',
    '/products/3d-printing/new',
    '/blog',
    '/portfolio',
    '/terms',
    '/privacy',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }))

  // ワークショップページは動的なので、後でSupabaseから取得する処理を追加できます
  // 現在は静的ページのみ返します
  return staticPages
}