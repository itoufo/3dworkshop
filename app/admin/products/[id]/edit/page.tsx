'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import ProductForm from '@/components/admin/ProductForm'
import type { Product } from '@/lib/products'

export default function EditProductPage() {
  const params = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('products').select('*').eq('id', params.id).single()
      setProduct((data as Product) ?? null)
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">読み込んでいます...</div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-600">
        商品が見つかりませんでした。
      </div>
    )
  }

  return <ProductForm product={product} />
}
