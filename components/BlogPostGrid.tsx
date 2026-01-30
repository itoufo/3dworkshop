'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, Eye, Tag, BookOpen } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url: string
  category: string
  tags: string[]
  author_name: string
  published_at: string
  view_count: number
}

interface BlogPostGridProps {
  posts: BlogPost[]
  categories: string[]
}

export default function BlogPostGrid({ posts, categories }: BlogPostGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const allCategories = ['all', ...categories]
  const filteredPosts = selectedCategory === 'all'
    ? posts
    : posts.filter(post => post.category === selectedCategory)

  return (
    <>
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {allCategories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:text-gray-900 hover:shadow-md'
            }`}
          >
            {category === 'all' ? '全て' : category}
          </button>
        ))}
      </div>

      {/* Blog Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">まだ記事がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
            >
              {/* Featured Image */}
              {post.featured_image_url ? (
                <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                  <Image
                    src={optimizeImageUrl(post.featured_image_url, 75)}
                    alt={`${post.title} - 3Dプリンタブログ | 3DLab`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzAwIiBoZWlnaHQ9IjQ3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-purple-300" />
                </div>
              )}

              {/* Content */}
              <div className="p-6">
                {post.category && (
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium mb-3">
                    {post.category}
                  </span>
                )}

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                  {post.title}
                </h3>

                {post.excerpt && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(post.published_at).toLocaleDateString('ja-JP')}
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-3 h-3 mr-1" />
                      {post.view_count}
                    </div>
                  </div>
                  {post.author_name && (
                    <span className="text-gray-600">{post.author_name}</span>
                  )}
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-4">
                    {post.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
