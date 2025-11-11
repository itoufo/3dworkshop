/**
 * Sitemap Generator for 3DLab
 *
 * このスクリプトは以下のURLを含むsitemap.xmlを生成します:
 * - 静的ページ（トップ、ワークショップ一覧、ブログ一覧など）
 * - 動的ページ（各ワークショップ詳細、各ブログ記事）
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// .envファイルを読み込み
dotenv.config()

// Supabase クライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// サイトのベースURL
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://3dlab.jp'

interface Workshop {
  id: string
  updated_at?: string
}

interface BlogPost {
  slug: string
  published_at: string
  updated_at?: string
}

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

/**
 * 静的ページのURL設定
 */
const staticPages: SitemapUrl[] = [
  {
    loc: '/',
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    loc: '/workshops',
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    loc: '/blog',
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    loc: '/school',
    lastmod: new Date().toISOString(),
    changefreq: 'weekly',
    priority: 0.7,
  },
]

/**
 * Supabaseからワークショップデータを取得
 */
async function fetchWorkshops(): Promise<Workshop[]> {
  try {
    const { data, error } = await supabase
      .from('workshops')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching workshops:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching workshops:', error)
    return []
  }
}

/**
 * Supabaseからブログ記事データを取得
 */
async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, published_at, updated_at')
      .eq('is_published', true)
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Error fetching blog posts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return []
  }
}

/**
 * ワークショップURLリストを生成
 */
function generateWorkshopUrls(workshops: Workshop[]): SitemapUrl[] {
  return workshops.map((workshop) => ({
    loc: `/workshops/${workshop.id}`,
    lastmod: workshop.updated_at || new Date().toISOString(),
    changefreq: 'weekly' as const,
    priority: 0.8,
  }))
}

/**
 * ブログURLリストを生成
 */
function generateBlogUrls(blogPosts: BlogPost[]): SitemapUrl[] {
  return blogPosts.map((post) => ({
    loc: `/blog/${post.slug}`,
    lastmod: post.updated_at || post.published_at,
    changefreq: 'monthly' as const,
    priority: 0.7,
  }))
}

/**
 * XML形式のサイトマップを生成
 */
function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map(
      (url) => `
  <url>
    <loc>${BASE_URL}${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`
}

/**
 * サイトマップをファイルに書き込み
 */
function writeSitemap(content: string): void {
  const publicDir = path.join(process.cwd(), 'public')
  const sitemapPath = path.join(publicDir, 'sitemap.xml')

  // publicディレクトリが存在しない場合は作成
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  fs.writeFileSync(sitemapPath, content, 'utf-8')
  console.log(`✅ Sitemap generated successfully at: ${sitemapPath}`)
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Starting sitemap generation...')
  console.log(`📍 Base URL: ${BASE_URL}`)

  // データ取得
  console.log('📡 Fetching data from Supabase...')
  const [workshops, blogPosts] = await Promise.all([
    fetchWorkshops(),
    fetchBlogPosts(),
  ])

  console.log(`✨ Found ${workshops.length} workshops`)
  console.log(`✨ Found ${blogPosts.length} blog posts`)

  // URL生成
  const workshopUrls = generateWorkshopUrls(workshops)
  const blogUrls = generateBlogUrls(blogPosts)
  const allUrls = [...staticPages, ...workshopUrls, ...blogUrls]

  console.log(`📝 Total URLs: ${allUrls.length}`)

  // サイトマップ生成と書き込み
  const sitemapXml = generateSitemapXml(allUrls)
  writeSitemap(sitemapXml)

  console.log('🎉 Sitemap generation completed!')
}

// 実行
main().catch((error) => {
  console.error('❌ Error generating sitemap:', error)
  process.exit(1)
})
