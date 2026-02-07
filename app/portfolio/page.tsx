'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import Link from 'next/link'
import { Calendar, User, Sparkles, ArrowRight } from 'lucide-react'

interface PortfolioItem {
  id: string
  title: string
  description: string
  category: string
  image_urls: string[]
  customer_name: string
  created_date: string
  display_order: number
  is_featured: boolean
  created_at: string
}

export default function PortfolioPage() {
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    fetchPortfolioItems()
  }, [])

  async function fetchPortfolioItems() {
    try {
      const query = supabase
        .from('portfolio_items')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      setPortfolioItems(data || [])
    } catch (error) {
      console.error('Error fetching portfolio items:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(portfolioItems.map(item => item.category).filter(Boolean)))]
  const filteredItems = selectedCategory === 'all' 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                お客様の作品集
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                実績紹介
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              ワークショップや3Dプリント制作で生まれた素敵な作品をご紹介します
            </p>
            <Link
              href="/products/3d-printing/new"
              className="mt-4 inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              3Dプリント制作を依頼する
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((category) => (
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

          {/* Portfolio Grid */}
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">まだ作品がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Image */}
                  {item.image_urls && item.image_urls[0] && (
                    <div className="relative w-full h-64 overflow-hidden">
                      <Image
                        src={item.image_urls[0]}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      {item.is_featured && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-medium rounded-full">
                          おすすめ
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{item.description}</p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      {item.customer_name && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          {item.customer_name}
                        </div>
                      )}
                      {item.created_date && (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(item.created_date).toLocaleDateString('ja-JP')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}