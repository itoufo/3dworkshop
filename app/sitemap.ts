import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://3dlab.jp'

  // 静的ページ（優先度とchangeFrequencyを最適化）
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/workshops`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/school`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/school/apply`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/products/3d-printing/new`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/team`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/portfolio`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // ワークショップページを動的に追加
  try {
    const { data: workshops } = await supabase
      .from('workshops')
      .select('id, updated_at, event_date')
      .order('event_date', { ascending: false })

    const workshopPages: MetadataRoute.Sitemap = (workshops || []).map((workshop) => ({
      url: `${baseUrl}/workshops/${workshop.id}`,
      lastModified: workshop.updated_at ? new Date(workshop.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // カテゴリピラーページを動的に追加
    const { data: categories } = await supabase
      .from('workshop_categories')
      .select('slug, updated_at')
      .order('sort_order', { ascending: true })

    const categoryPages: MetadataRoute.Sitemap = (categories || []).map((category) => ({
      url: `${baseUrl}/workshops/category/${category.slug}`,
      lastModified: category.updated_at ? new Date(category.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

    // ブログ記事を動的に追加
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('slug, updated_at, published_at, is_published')
      .eq('is_published', true)
      .order('published_at', { ascending: false })

    const blogPages: MetadataRoute.Sitemap = (blogPosts || []).map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updated_at 
        ? new Date(post.updated_at) 
        : post.published_at 
        ? new Date(post.published_at) 
        : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))

    return [...staticPages, ...workshopPages, ...categoryPages, ...blogPages]
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}