'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Package, Printer3d } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string
  category: string
  base_price: number
  image_urls: string[]
  specifications: any
  is_active: boolean
  stock_quantity: number | null
  created_at: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [navigating, setNavigating] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProductClick = (productId: string, category: string) => {
    if (navigating) return
    
    setNavigating(productId)
    
    if (category === '3d_printing') {
      router.push('/products/3d-printing/new')
    } else if (category === 'workshop') {
      router.push(`/workshops/${productId}`)
    } else {
      router.push(`/products/${productId}`)
    }
  }

  const categories = [
    { key: 'all', label: '全て' },
    { key: 'workshop', label: 'ワークショップ' },
    { key: '3d_printing', label: '3Dプリント' },
    { key: 'product', label: '商品' },
  ]

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <>
      {navigating && <LoadingOverlay message="読み込んでいます..." />}
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <Header />
        
        <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  商品・サービス
                </span>
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                ワークショップ、3Dプリント制作、オリジナル商品など、様々なサービスをご用意しています
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className={`inline-flex items-center px-6 py-3 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.key
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:text-gray-900 hover:shadow-md'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* 3Dプリント発注ボタン */}
            {(selectedCategory === 'all' || selectedCategory === '3d_printing') && (
              <div className="mb-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-white text-center">
                <h2 className="text-2xl font-bold mb-4">3Dプリント制作を依頼する</h2>
                <p className="mb-6 text-white/90">
                  STLファイルをアップロードして、オリジナルの3Dプリント制作を依頼できます
                </p>
                <button
                  onClick={() => handleProductClick('new', '3d_printing')}
                  className="inline-flex items-center px-8 py-3 bg-white text-purple-600 rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Printer3d className="w-5 h-5 mr-2" />
                  3Dプリント発注へ
                </button>
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">まだ商品がありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product.id, product.category)}
                    className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer ${
                      navigating === product.id ? 'opacity-75 pointer-events-none' : ''
                    }`}
                  >
                    {/* Image */}
                    {product.image_urls && product.image_urls[0] ? (
                      <div className="relative w-full h-56 overflow-hidden">
                        <Image
                          src={product.image_urls[0]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-56 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <Package className="w-12 h-12 text-purple-300" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          {product.category === 'workshop' && 'ワークショップ'}
                          {product.category === '3d_printing' && '3Dプリント'}
                          {product.category === 'product' && '商品'}
                        </span>
                        {product.stock_quantity !== null && product.stock_quantity > 0 && (
                          <span className="text-xs text-gray-500">
                            在庫: {product.stock_quantity}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {product.name}
                      </h3>
                      
                      {product.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">
                            {product.category === '3d_printing' ? '基本料金' : '価格'}
                          </p>
                          <p className="text-xl font-bold text-gray-900">
                            ¥{product.base_price.toLocaleString()}
                            {product.category === '3d_printing' && <span className="text-sm font-normal">〜</span>}
                          </p>
                        </div>
                        <div className="text-purple-600 group-hover:text-purple-700 transition-colors">
                          詳細を見る →
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}