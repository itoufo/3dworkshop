'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import LoadingOverlay from '@/components/LoadingOverlay'
import { adminJson, refreshPublicPages } from '@/lib/admin-api-client'
import { deleteAdminRecord } from '@/lib/admin-delete-client'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { firstImageUrl } from '@/lib/media'
import { Layers, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { ProductSeries } from '@/lib/products'

type SeriesRow = ProductSeries & { item_count: number; active_item_count: number }

export default function AdminProductSeriesPage() {
  const router = useRouter()
  const [series, setSeries] = useState<SeriesRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState(false)

  const load = useCallback(async () => {
    const res = await adminJson<{ series: SeriesRow[] }>('/api/admin/product-series')
    if (res.ok) {
      setSeries(res.data.series)
      setError(null)
    } else {
      setError(res.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(row: SeriesRow) {
    const res = await adminJson(`/api/admin/product-series/${row.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ ...row, is_active: !row.is_active }),
    })
    if (!res.ok) {
      alert(res.message)
      return
    }
    await refreshPublicPages()
    load()
  }

  async function remove(row: SeriesRow) {
    if (
      !confirm(
        `シリーズ「${row.name}」を削除しますか？\n入っている商品 ${row.item_count} 件は消えずに、単品の商品に戻ります。`
      )
    )
      return
    const failure = await deleteAdminRecord('product-series', row.id, {
      inUse: '削除できませんでした。',
      failed: '削除に失敗しました',
    })
    if (failure) {
      alert(failure)
      return
    }
    load()
  }

  function go(href: string) {
    setNavigating(true)
    router.push(href)
  }

  return (
    <>
      {navigating && <LoadingOverlay message="読み込んでいます..." />}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Layers className="w-6 h-6 mr-2 text-purple-600" />
                シリーズ（物販）
              </h1>
              <p className="text-gray-600 mt-1">
                サイズ・色などの違う商品を1ページにまとめます。商品は「商品管理」でシリーズを選んで作ります。
              </p>
            </div>
            <button
              onClick={() => go('/admin/product-series/new')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              新規シリーズ
            </button>
          </div>

          {error && <div className="bg-red-50 text-red-700 rounded-xl p-4 mb-4">{error}</div>}

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-500">読み込んでいます...</div>
          ) : series.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">シリーズはまだありません。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {series.map((row) => (
                <div key={row.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-5">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 shrink-0">
                    {firstImageUrl(row.media_urls) && (
                      <Image
                        src={optimizeImageUrl(firstImageUrl(row.media_urls)!, 50)}
                        alt={row.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-gray-900 truncate">{row.name}</h2>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          row.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {row.is_active ? '公開中' : '非公開'}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">
                      選ぶ項目: {row.option_axes.join('・')}　商品 {row.item_count} 件（公開中 {row.active_item_count} 件）
                    </p>
                    <p className="text-gray-500 text-sm">/products/series/{row.slug}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/products/series/${row.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title="シリーズのページを開く"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                    <button
                      onClick={() => toggleActive(row)}
                      className={`px-3 py-1.5 text-sm rounded-full border ${
                        row.is_active
                          ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {row.is_active ? '非公開にする' : '公開する'}
                    </button>
                    <button
                      onClick={() => go(`/admin/product-series/${row.id}/edit`)}
                      className="p-2 text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                      title="編集"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => remove(row)}
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
    </>
  )
}
