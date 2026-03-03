import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import Link from 'next/link'
import { Calendar, Eye, Tag, ArrowLeft, BookOpen, User, Sparkles, ArrowRight } from 'lucide-react'
import { Breadcrumb } from '@/components/Breadcrumb'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { getBlogPost, getRelatedPosts } from '@/lib/blog'
import ViewCountIncrementer from '@/components/ViewCountIncrementer'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const blogPost = await getBlogPost(slug)

  if (!blogPost) {
    notFound()
  }

  // Fetch related posts (non-blocking for the main content)
  const relatedPosts = blogPost.category
    ? await getRelatedPosts(blogPost.id, blogPost.category)
    : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      {/* Fire-and-forget view count increment */}
      <ViewCountIncrementer postId={blogPost.id} />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              { name: 'ブログ', href: '/blog' },
              { name: blogPost.title, href: `/blog/${blogPost.slug}` }
            ]}
          />
          <Link
            href="/blog"
            className="flex items-center text-purple-600 hover:text-purple-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ブログ一覧に戻る
          </Link>

          <div className="lg:flex lg:gap-8">
            {/* Article */}
            <article className="lg:flex-1 min-w-0 bg-white rounded-xl shadow-xl overflow-hidden">
              {/* Featured Image */}
              {blogPost.featured_image_url ? (
                <div className="relative w-full aspect-video">
                  <Image
                    src={optimizeImageUrl(blogPost.featured_image_url)}
                    alt={`${blogPost.title} - 3Dプリンタブログ | 3DLab`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 1200px) 100vw, 1200px"
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <BookOpen className="w-24 h-24 text-purple-300" />
                </div>
              )}

              {/* Article Content */}
              <div className="p-8 md:p-12">
                {/* Category */}
                {blogPost.category && (
                  <div className="mb-4">
                    <span className="inline-block px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {blogPost.category}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  {blogPost.title}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-gray-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    {blogPost.author_name || '3DLab'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(blogPost.published_at).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Eye className="w-4 h-4 mr-2" />
                    {blogPost.view_count.toLocaleString()} views
                  </div>
                </div>

                {/* Content */}
                <div
                  className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-purple-600 prose-strong:text-gray-900 prose-img:rounded-xl"
                  dangerouslySetInnerHTML={{ __html: blogPost.content }}
                />

                {/* Tags */}
                {blogPost.tags && blogPost.tags.length > 0 && (
                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                      <Tag className="w-4 h-4 mr-2" />
                      タグ
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {blogPost.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </article>

            {/* Sidebar (PC only) */}
            <aside className="hidden lg:block lg:w-80 shrink-0">
              <div className="sticky top-28 space-y-6">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg">
                  <div className="flex items-center space-x-2 mb-3">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold text-lg">ワークショップ</h3>
                  </div>
                  <p className="text-sm text-purple-100 mb-5 leading-relaxed">
                    3Dプリンターを実際に体験してみませんか？初心者歓迎のワークショップを開催中！
                  </p>
                  <Link
                    href="/workshops"
                    className="flex items-center justify-center w-full px-4 py-3 bg-white text-purple-700 rounded-xl font-semibold hover:bg-purple-50 transition-colors text-sm"
                  >
                    ワークショップを見る
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">関連記事</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {post.featured_image_url ? (
                      <div className="relative w-full aspect-video">
                        <Image
                          src={optimizeImageUrl(post.featured_image_url, 75)}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-purple-300" />
                      </div>
                    )}
                    <div className="p-4">
                      {post.category && (
                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium mb-2">
                          {post.category}
                        </span>
                      )}
                      <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {post.title}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(post.published_at).toLocaleDateString('ja-JP')}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Workshop CTA (Mobile Only) */}
      <Link
        href="/workshops"
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-3.5 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center space-x-2 font-semibold"
      >
        <Sparkles className="w-5 h-5" />
        <span>3Dプリンター体験</span>
      </Link>
    </div>
  )
}
