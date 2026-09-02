'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AdminSidebar from '@/components/AdminSidebar'
import LoadingOverlay from '@/components/LoadingOverlay'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { firstImageUrl, isVideoUrl } from '@/lib/media'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { Package, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from 'lucide-react'
import type { Product } from '@/lib/products'

export default function AdminProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState(false)

  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error loading products:', error)
    }
    setProducts((data as Product[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  async function toggleActive(product: Product) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id)
    if (error) {
      alert('公開状態の変更に失敗しました')
      return
    }
    loadProducts()
  }

  async function deleteProduct(product: Product) {
    if (!confirm(`「${product.name}」を削除しますか？`)) return
    const { error } = await supabase.from('products').delete().eq('id', product.id)
    if (error) {
      // 注文が紐づいている商品は外部キー制約で削除できない（履歴を残すため）
      console.error('Error deleting product:', error)
      alert('削除できませんでした。ご注文がある商品は削除せず、非公開にしてください。')
      return
    }
    loadProducts()
  }

  return (
    <div className="flex">
      {navigating && <LoadingOverlay message="読み込んでいます..." />}
      <AdminSidebar />

      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Package className="w-6 h-6 mr-2 text-purple-600" />
                商品管理（物販）
              </h1>
              <p className="text-gray-600 mt-1">{SHIPPING_LEAD_TIME_TEXT}する商品を登録します</p>
            </div>
            <button
              onClick={() => {
                setNavigating(true)
                router.push('/admin/products/new')
              }}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              新規商品
            </button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">
              読み込んでいます...
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">商品がまだありません。「新規商品」から追加してください。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 shrink-0">
                    {firstImageUrl(product.media_urls) && (
                      <Image
                        src={optimizeImageUrl(firstImageUrl(product.media_urls)!, 50)}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-gray-900 truncate">{product.name}</h2>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          product.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {product.is_active ? '公開中' : '非公開'}
                      </span>
                      {product.category !== 'product' && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-700 mt-1">
                      ¥{product.base_price.toLocaleString()}
                      <span className="text-gray-500 text-sm ml-3">
                        {product.stock_quantity === null ? '受注製作' : `在庫 ${product.stock_quantity} 点`}
                      </span>
                      <span className="text-gray-500 text-sm ml-3">
                        写真 {(product.media_urls ?? []).filter((u) => !isVideoUrl(u)).length} 枚
                        {(product.media_urls ?? []).some(isVideoUrl) &&
                          ` / 動画 ${(product.media_urls ?? []).filter(isVideoUrl).length} 本`}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/products/${product.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title="商品ページを開く"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => toggleActive(product)}
                      className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title={product.is_active ? '非公開にする' : '公開する'}
                    >
                      {product.is_active ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setNavigating(true)
                        router.push(`/admin/products/${product.id}/edit`)
                      }}
                      className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title="編集"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteProduct(product)}
                      className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                      title="削除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
