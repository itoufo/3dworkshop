'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import SeriesForm from '@/components/admin/SeriesForm'
import { adminJson } from '@/lib/admin-api-client'
import type { ProductSeries } from '@/lib/products'

export default function EditProductSeriesPage() {
  const params = useParams<{ id: string }>()
  const [series, setSeries] = useState<ProductSeries | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminJson<{ series: ProductSeries }>(`/api/admin/product-series/${params.id}`).then((res) => {
      if (res.ok) setSeries(res.data.series)
      else setError(res.message)
      setLoading(false)
    })
  }, [params.id])

  if (loading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">読み込んでいます...</div>
  }
  if (!series) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-600">
        {error ?? 'シリーズが見つかりませんでした。'}
      </div>
    )
  }
  return <SeriesForm series={series} />
}
