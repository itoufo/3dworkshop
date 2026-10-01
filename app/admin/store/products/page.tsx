'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { adminFetch } from '@/lib/store/admin-fetch'
import { PRODUCT_STATUS_LABEL, type ProductStatus } from '@/lib/store/product-rules'
import { splitPrice } from '@/lib/store/pricing'

type Product = {
  id: string
  title: string
  description: string | null
  image_urls: string[]
  data_file_path: string | null
  data_file_name: string | null
  sell_data: boolean
  data_price: number | null
  sell_print: boolean
  print_price: number | null
  print_spec: string | null
  status: ProductStatus
  review_note: string | null
  submitted_at: string | null
  updated_at: string
  seller: { id: string; display_name: string; slug: string; status: string } | null
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`
const FILTERS: (ProductStatus | 'all')[] = ['pending_review', 'published', 'rejected', 'all']

export default function AdminStoreProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState<ProductStatus | 'all'>('pending_review')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const q = filter === 'all' ? '' : `?status=${filter}`
    const { ok, body } = await adminFetch<{ products: Product[] }>(`/api/admin/store/products${q}`)
    if (ok) {
      setProducts(body.products ?? [])
      setError(null)
    } else setError(body.error || '取得に失敗しました')
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function decide(p: Product, action: 'approve' | 'reject' | 'unpublish') {
    const { ok, body } = await adminFetch(`/api/admin/store/products/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, review_note: notes[p.id] ?? '', updated_at: p.updated_at }),
    })
    if (!ok) {
      setError(body.error || '更新に失敗しました')
      return
    }
    setError(null)
    await load()
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">ストア: 作品の審査</h1>
      <p className="mt-2 text-gray-600">
        データを開いて、印刷できるか・権利に問題が無いかを確かめてから承認してください。差し戻しには理由が要ります（出品者にメールで届きます）。
      </p>
      <div className="mt-4 flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {f === 'all' ? 'すべて' : PRODUCT_STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-6 text-gray-600">読み込み中…</p>
      ) : products.length === 0 ? (
        <p className="mt-6 text-gray-600">該当する作品はありません。</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {products.map((p) => (
            <li key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="px-2 py-0.5 rounded bg-gray-100 text-sm">{PRODUCT_STATUS_LABEL[p.status]}</span>
                <span className="font-bold text-lg">{p.title}</span>
                <span className="text-gray-600 text-sm">
                  出品者 {p.seller?.display_name}
                  {p.seller && p.seller.status !== 'approved' && <span className="text-red-700">（出品者が未承認）</span>}
                </span>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {p.image_urls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative w-24 h-24 shrink-0 rounded overflow-hidden bg-gray-100">
                    <Image src={url} alt="" fill sizes="96px" className="object-cover" />
                  </a>
                ))}
              </div>
              {p.description && <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">{p.description}</p>}
              <div className="mt-3 text-sm text-gray-800 space-y-1">
                {p.sell_data && p.data_price != null && (
                  <p>データ {yen(p.data_price)}（出品者 {yen(splitPrice('data', p.data_price).sellerAmount)}）</p>
                )}
                {p.sell_print && p.print_price != null && (
                  <p>
                    完成品 {yen(p.print_price)}（出品者 {yen(splitPrice('print', p.print_price).sellerAmount)}）
                    {p.print_spec && <span className="text-gray-600"> 仕様: {p.print_spec}</span>}
                  </p>
                )}
                {p.data_file_path ? (
                  <a href={`/api/admin/store/products/${p.id}/file`} className="text-purple-700 underline">
                    データをダウンロード（{p.data_file_name || 'ファイル'}）
                  </a>
                ) : (
                  <p className="text-red-700">データなし</p>
                )}
              </div>
              {p.review_note && <p className="mt-2 text-sm text-amber-800">前回のコメント: {p.review_note}</p>}
              {(p.status === 'pending_review' || p.status === 'published') && (
                <>
                  <textarea
                    className="mt-3 w-full rounded border border-gray-300 p-2 text-sm"
                    rows={2}
                    placeholder="差し戻しの理由（出品者に届きます）"
                    value={notes[p.id] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setNotes((prev) => ({ ...prev, [p.id]: value }))
                    }}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.status === 'pending_review' && (
                      <>
                        <button onClick={() => decide(p, 'approve')} className="px-4 py-2 rounded bg-green-600 text-white text-sm">
                          承認して掲載する
                        </button>
                        <button onClick={() => decide(p, 'reject')} className="px-4 py-2 rounded bg-gray-600 text-white text-sm">
                          差し戻す
                        </button>
                      </>
                    )}
                    {p.status === 'published' && (
                      <button onClick={() => decide(p, 'unpublish')} className="px-4 py-2 rounded bg-red-600 text-white text-sm">
                        掲載をやめて差し戻す
                      </button>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
