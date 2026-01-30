/**
 * JSON-LD Schema Validator for 3DLab
 *
 * BlogPosting / LocalBusiness / BreadcrumbList の必須フィールドを検証します。
 * Usage: npx tsx scripts/validate-schema.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Google リッチリザルトが要求する BlogPosting 必須フィールド
const REQUIRED_BLOG_POSTING_FIELDS = [
  '@context',
  '@type',
  'headline',
  'image',
  'datePublished',
  'author',
  'publisher',
] as const

// 推奨フィールド
const RECOMMENDED_BLOG_POSTING_FIELDS = [
  'dateModified',
  'description',
  'mainEntityOfPage',
  'articleSection',
  'inLanguage',
  'wordCount',
] as const

interface ValidationResult {
  slug: string
  title: string
  errors: string[]
  warnings: string[]
}

// BlogArticleSchema のロジックを再現（components/StructuredData.tsx と同等）
function buildBlogSchema(article: Record<string, unknown>) {
  const content = (article.content as string) || ''
  const plainContent = content.replace(/<[^>]*>/g, '')

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt || article.description || '',
    image: article.featured_image_url || 'https://3dlab.jp/og-image.jpg',
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: {
      '@type': 'Person',
      name: article.author_name || '3DLab',
    },
    publisher: {
      '@type': 'Organization',
      name: '3DLab - 3Dプリンタ教室',
      url: 'https://3dlab.jp',
      logo: {
        '@type': 'ImageObject',
        url: 'https://3dlab.jp/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://3dlab.jp/blog/${article.slug}`,
    },
    inLanguage: 'ja',
    ...(plainContent.length > 0 && { wordCount: plainContent.length }),
    articleSection: article.category,
    keywords: (article.tags as string[])?.join(', ') || '',
  }
}

function validateSchema(
  schema: Record<string, unknown>,
  slug: string,
  title: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // 必須フィールドチェック
  for (const field of REQUIRED_BLOG_POSTING_FIELDS) {
    const value = schema[field]
    if (value === undefined || value === null || value === '') {
      errors.push(`必須フィールド "${field}" が未設定`)
    }
  }

  // 推奨フィールドチェック
  for (const field of RECOMMENDED_BLOG_POSTING_FIELDS) {
    const value = schema[field]
    if (value === undefined || value === null || value === '') {
      warnings.push(`推奨フィールド "${field}" が未設定`)
    }
  }

  // headline 長さチェック（Google推奨: 110文字以内）
  const headline = schema.headline as string
  if (headline && headline.length > 110) {
    warnings.push(`headline が ${headline.length} 文字（推奨: 110文字以内）`)
  }

  // author 構造チェック
  const author = schema.author as Record<string, unknown> | undefined
  if (author && !author.name) {
    errors.push('author.name が未設定')
  }

  // publisher 構造チェック
  const publisher = schema.publisher as Record<string, unknown> | undefined
  if (publisher) {
    if (!publisher.name) errors.push('publisher.name が未設定')
    const logo = publisher.logo as Record<string, unknown> | undefined
    if (!logo?.url) warnings.push('publisher.logo.url が未設定')
  }

  return { slug, title, errors, warnings }
}

async function main() {
  console.log('=== JSON-LD Schema Validation ===\n')

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Supabase Error:', error.message)
    process.exit(1)
  }

  if (!posts || posts.length === 0) {
    console.log('公開済み記事がありません。')
    process.exit(0)
  }

  console.log(`${posts.length} 件の公開記事を検証中...\n`)

  let totalErrors = 0
  let totalWarnings = 0

  for (const post of posts) {
    const schema = buildBlogSchema(post)
    const result = validateSchema(
      schema as unknown as Record<string, unknown>,
      post.slug,
      post.title
    )

    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.log(`--- ${result.title} (/${result.slug}) ---`)
      for (const err of result.errors) {
        console.log(`  [ERROR] ${err}`)
      }
      for (const warn of result.warnings) {
        console.log(`  [WARN]  ${warn}`)
      }
      console.log()
    }

    totalErrors += result.errors.length
    totalWarnings += result.warnings.length
  }

  console.log('=== 結果サマリ ===')
  console.log(`記事数: ${posts.length}`)
  console.log(`エラー: ${totalErrors}`)
  console.log(`警告:   ${totalWarnings}`)

  if (totalErrors > 0) {
    console.log('\nスキーマにエラーがあります。修正してください。')
    process.exit(1)
  }

  if (totalWarnings > 0) {
    console.log('\n推奨フィールドの不足があります。改善を検討してください。')
  } else {
    console.log('\n全記事のスキーマが正常です。')
  }
}

main()
