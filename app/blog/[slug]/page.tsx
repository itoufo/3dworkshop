'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { Calendar, Eye, Tag, ArrowLeft, BookOpen, User } from 'lucide-react'
import { BlogArticleSchema } from '@/components/StructuredData'
import { Breadcrumb } from '@/components/Breadcrumb'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url: string
  category: string
  tags: string[]
  author_name: string
  is_published: boolean
  published_at: string
  view_count: number
  created_at: string
}

export default function BlogPostPage() {
  const params = useParams()
  const router = useRouter()
  const [blogPost, setBlogPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])

  const incrementViewCount = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.rpc('increment_blog_view_count', {
        post_id: postId
      })

      if (error) {
        // RPCが存在しない場合は、通常のUPDATEで対応
        const { data: currentPost } = await supabase
          .from('blog_posts')
          .select('view_count')
          .eq('id', postId)
          .single()

        if (currentPost) {
          await supabase
            .from('blog_posts')
            .update({ view_count: (currentPost.view_count || 0) + 1 })
            .eq('id', postId)
        }
      }
    } catch (error) {
      console.error('Error incrementing view count:', error)
    }
  }, [])

  const fetchRelatedPosts = useCallback(async (currentPostId: string, category: string) => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .eq('category', category)
        .neq('id', currentPostId)
        .order('published_at', { ascending: false })
        .limit(3)

      if (error) throw error
      setRelatedPosts(data || [])
    } catch (error) {
      console.error('Error fetching related posts:', error)
    }
  }, [])

  const fetchBlogPost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', params.slug)
        .eq('is_published', true)
        .single()

      if (error) throw error

      if (data) {
        setBlogPost(data)
        
        // 構造化データを追加
        const structuredData = BlogArticleSchema(data)
        const scriptId = 'blog-structured-data'
        
        // 既存のスクリプトを削除
        const existingScript = document.getElementById(scriptId)
        if (existingScript) {
          existingScript.remove()
        }
        
        // 新しいスクリプトを追加
        const script = document.createElement('script')
        script.id = scriptId
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(structuredData)
        document.head.appendChild(script)
        
        // 閲覧数を増やす
        await incrementViewCount(data.id)
        // 関連記事を取得
        if (data.category) {
          await fetchRelatedPosts(data.id, data.category)
        }
      }
    } catch (error) {
      console.error('Error fetching blog post:', error)
    } finally {
      setLoading(false)
    }
  }, [params.slug, incrementViewCount, fetchRelatedPosts])

  useEffect(() => {
    fetchBlogPost()
  }, [fetchBlogPost])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!blogPost) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <Header />
        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">記事が見つかりません</h1>
            <p className="text-gray-600 mb-8">お探しの記事は存在しないか、削除された可能性があります。</p>
            <button
              onClick={() => router.push('/blog')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ブログ一覧に戻る
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          {blogPost && (
            <Breadcrumb 
              items={[
                { name: 'ブログ', href: '/blog' },
                { name: blogPost.title, href: `/blog/${blogPost.slug}` }
              ]} 
            />
          )}
          <button
            onClick={() => router.push('/blog')}
            className="flex items-center text-purple-600 hover:text-purple-700 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            ブログ一覧に戻る
          </button>

          {/* Article Header */}
          <article className="bg-white rounded-3xl shadow-xl overflow-hidden">
            {/* Featured Image */}
            {blogPost.featured_image_url ? (
              <div className="relative w-full h-96">
                <Image
                  src={blogPost.featured_image_url}
                  alt={`${blogPost.title} - 3Dプリンタブログ | 3DLab`}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1200px) 100vw, 1200px"
                />
              </div>
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
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

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">関連記事</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedPosts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => router.push(`/blog/${post.slug}`)}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer text-left"
                  >
                    {post.featured_image_url ? (
                      <div className="relative w-full h-48">
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
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
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
