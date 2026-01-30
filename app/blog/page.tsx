import { createClient } from '@supabase/supabase-js'
import Header from '@/components/Header'
import { BookOpen } from 'lucide-react'
import BlogPostGrid from '@/components/BlogPostGrid'
import Link from 'next/link'

const POSTS_PER_PAGE = 12

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface BlogPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const offset = (currentPage - 1) * POSTS_PER_PAGE

  // 総件数取得
  const { count } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const totalPages = Math.ceil((count || 0) / POSTS_PER_PAGE)

  // 該当ページの記事取得
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image_url, category, tags, author_name, published_at, view_count')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .range(offset, offset + POSTS_PER_PAGE - 1)

  const blogPosts = posts || []

  // カテゴリ一覧を取得
  const categories = Array.from(
    new Set(blogPosts.map(post => post.category).filter(Boolean))
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                <BookOpen className="w-4 h-4 mr-2" />
                3D Lab ブログ
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                最新情報 & お役立ち情報
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              3Dプリンティングの技術情報、ワークショップレポート、制作のコツなどをお届けします
            </p>
          </div>

          {/* Blog Grid (Client Component) */}
          <BlogPostGrid posts={blogPosts} categories={categories} />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex justify-center items-center gap-2 mt-16" aria-label="ページネーション">
              {currentPage > 1 && (
                <Link
                  href={`/blog?page=${currentPage - 1}`}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-600 hover:shadow-md transition-all"
                >
                  前のページ
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Link
                  key={pageNum}
                  href={`/blog?page=${pageNum}`}
                  className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all ${
                    pageNum === currentPage
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:shadow-md'
                  }`}
                >
                  {pageNum}
                </Link>
              ))}

              {currentPage < totalPages && (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-600 hover:shadow-md transition-all"
                >
                  次のページ
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>
    </div>
  )
}
