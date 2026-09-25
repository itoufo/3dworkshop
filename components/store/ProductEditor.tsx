'use client'

import { useState } from 'react'
import Image from 'next/image'
import { uploadSellerFile } from '@/lib/store/upload-client'
import { splitPrice, SELLER_SHARE_PERCENT } from '@/lib/store/pricing'
import {
  DATA_EXTENSIONS,
  DATA_MAX_BYTES,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
  PRICE_MAX,
  PRICE_MIN,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_IMAGES_MAX,
  PRODUCT_PRINT_SPEC_MAX,
  PRODUCT_STATUS_LABEL,
  PRODUCT_TITLE_MAX,
  extensionOf,
  type ProductStatus,
} from '@/lib/store/product-rules'

export type EditableProduct = {
  id: string | null
  status: ProductStatus
  review_note: string | null
  title: string
  description: string
  image_urls: string[]
  data_file_path: string | null
  data_file_name: string | null
  sell_data: boolean
  data_price: string
  sell_print: boolean
  print_price: string
  print_spec: string
}

export const EMPTY_PRODUCT: EditableProduct = {
  id: null,
  status: 'draft',
  review_note: null,
  title: '',
  description: '',
  image_urls: [],
  data_file_path: null,
  data_file_name: null,
  sell_data: true,
  data_price: '',
  sell_print: false,
  print_price: '',
  print_spec: '',
}

const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base'
const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

function ShareNote({ kind, price }: { kind: 'data' | 'print'; price: string }) {
  const n = Number(price)
  if (!Number.isInteger(n) || n < PRICE_MIN) return null
  const { sellerAmount } = splitPrice(kind, n)
  return (
    <p className="mt-1 text-base text-gray-600">
      あなたの取り分: {yen(sellerAmount)}（{SELLER_SHARE_PERCENT[kind]}%）
    </p>
  )
}

export default function ProductEditor({ initial }: { initial: EditableProduct }) {
  const [p, setP] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const set = <K extends keyof EditableProduct>(key: K, value: EditableProduct[K]) => setP((prev) => ({ ...prev, [key]: value }))
  const liveOrReviewing = p.status === 'published' || p.status === 'pending_review'

  async function addImages(files: FileList | null) {
    if (!files) return
    setError(null)
    for (const file of Array.from(files)) {
      if (p.image_urls.length >= PRODUCT_IMAGES_MAX) break
      if (!IMAGE_TYPES[file.type]) {
        setError('画像は JPEG / PNG / WebP にしてください')
        continue
      }
      if (file.size > IMAGE_MAX_BYTES) {
        setError(`画像は ${IMAGE_MAX_BYTES / 1024 / 1024}MB までです`)
        continue
      }
      setUploading('画像')
      const result = await uploadSellerFile('image', file)
      setUploading(null)
      if ('error' in result) {
        setError(result.error)
        continue
      }
      setP((prev) => ({ ...prev, image_urls: [...prev.image_urls, result.publicUrl!].slice(0, PRODUCT_IMAGES_MAX) }))
    }
  }

  async function setDataFile(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!(DATA_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))) {
      setError(`データは ${DATA_EXTENSIONS.join(' / ').toUpperCase()} にしてください`)
      return
    }
    if (file.size > DATA_MAX_BYTES) {
      setError(`データは ${DATA_MAX_BYTES / 1024 / 1024}MB までです`)
      return
    }
    setUploading('3D データ')
    const result = await uploadSellerFile('data', file)
    setUploading(null)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setP((prev) => ({ ...prev, data_file_path: result.path, data_file_name: file.name }))
  }

  async function save(action: 'save' | 'submit' | 'withdraw') {
    setBusy(true)
    setError(null)
    setMessage(null)
    const payload = {
      title: p.title,
      description: p.description,
      image_urls: p.image_urls,
      data_file_path: p.data_file_path,
      data_file_name: p.data_file_name,
      sell_data: p.sell_data,
      data_price: p.sell_data ? Number(p.data_price) : null,
      sell_print: p.sell_print,
      print_price: p.sell_print ? Number(p.print_price) : null,
      print_spec: p.print_spec,
    }

    try {
      let id = p.id
      if (!id) {
        if (action === 'withdraw') return
        const res = await fetch('/api/store/sell/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(body.error || '保存に失敗しました')
          return
        }
        id = body.id as string
        setP((prev) => ({ ...prev, id }))
        window.history.replaceState(null, '', `/sell/products/${id}`)
        if (action === 'save') {
          setMessage('下書きを保存しました')
          return
        }
      }

      const res = await fetch(`/api/store/sell/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'withdraw' ? { action } : { ...payload, action }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || '保存に失敗しました')
        return
      }
      setP((prev) => ({ ...prev, status: body.status, review_note: action === 'withdraw' ? prev.review_note : null }))
      setMessage(
        body.status === 'pending_review'
          ? '審査に出しました。結果はメールでお知らせします'
          : body.status === 'archived'
            ? '取り下げました'
            : '保存しました'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded bg-gray-100 text-base text-gray-700">{PRODUCT_STATUS_LABEL[p.status]}</span>
        {liveOrReviewing && (
          <span className="text-base text-gray-600">内容を変えて保存すると、もう一度審査になります（審査中は非掲載）</span>
        )}
      </div>
      {p.status === 'rejected' && p.review_note && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-base text-amber-900 whitespace-pre-wrap">
          差し戻しの理由: {p.review_note}
        </div>
      )}

      <label className="block">
        <span className="text-base font-bold text-gray-800">作品名</span>
        <input className={input} maxLength={PRODUCT_TITLE_MAX} value={p.title} onChange={(e) => set('title', e.target.value)} />
      </label>

      <label className="block">
        <span className="text-base font-bold text-gray-800">説明</span>
        <textarea className={input} rows={6} maxLength={PRODUCT_DESCRIPTION_MAX} value={p.description} onChange={(e) => set('description', e.target.value)} />
      </label>

      <div>
        <p className="text-base font-bold text-gray-800">画像（{PRODUCT_IMAGES_MAX}枚まで。1枚目が一覧に出ます）</p>
        <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-3">
          {p.image_urls.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image src={url} alt={`画像${i + 1}`} fill sizes="120px" className="object-cover" />
              <button
                type="button"
                onClick={() => set('image_urls', p.image_urls.filter((u) => u !== url))}
                className="absolute top-1 right-1 bg-white/90 rounded px-2 text-base"
                aria-label={`画像${i + 1}を外す`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {p.image_urls.length < PRODUCT_IMAGES_MAX && (
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="mt-3 block text-base"
            onChange={(e) => {
              addImages(e.target.files)
              e.target.value = ''
            }}
          />
        )}
      </div>

      <div>
        <p className="text-base font-bold text-gray-800">3D データ（{DATA_EXTENSIONS.join(' / ').toUpperCase()}、{DATA_MAX_BYTES / 1024 / 1024}MB まで）</p>
        <p className="text-base text-gray-600">データ販売では購入者がダウンロードし、印刷販売では 3DLab がこのデータで印刷します。</p>
        {p.data_file_path && <p className="mt-2 text-base text-gray-800">アップロード済み: {p.data_file_name || p.data_file_path.split('/').pop()}</p>}
        <input
          type="file"
          accept=".stl,.3mf,.obj"
          className="mt-2 block text-base"
          onChange={(e) => {
            setDataFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      <fieldset className="rounded-xl border border-gray-200 p-5 space-y-5">
        <legend className="px-2 text-base font-bold text-gray-800">売り方（両方でも可）</legend>
        <div>
          <label className="flex items-center gap-2 text-base text-gray-800">
            <input type="checkbox" checked={p.sell_data} onChange={(e) => set('sell_data', e.target.checked)} />
            データを販売する（購入者が自分で印刷）
          </label>
          {p.sell_data && (
            <label className="block mt-2 ml-6">
              <span className="text-base text-gray-700">価格（円）</span>
              <input className={input} inputMode="numeric" value={p.data_price} onChange={(e) => set('data_price', e.target.value.replace(/[^0-9]/g, ''))} />
              <ShareNote kind="data" price={p.data_price} />
            </label>
          )}
        </div>
        <div>
          <label className="flex items-center gap-2 text-base text-gray-800">
            <input type="checkbox" checked={p.sell_print} onChange={(e) => set('sell_print', e.target.checked)} />
            3DLab が印刷して販売する（完成品をお届け）
          </label>
          {p.sell_print && (
            <div className="ml-6 space-y-3">
              <label className="block mt-2">
                <span className="text-base text-gray-700">価格（円・送料込み）</span>
                <input className={input} inputMode="numeric" value={p.print_price} onChange={(e) => set('print_price', e.target.value.replace(/[^0-9]/g, ''))} />
                <ShareNote kind="print" price={p.print_price} />
              </label>
              <label className="block">
                <span className="text-base text-gray-700">印刷の仕様（大きさ・色・素材など）</span>
                <textarea className={input} rows={3} maxLength={PRODUCT_PRINT_SPEC_MAX} value={p.print_spec} onChange={(e) => set('print_spec', e.target.value)} />
              </label>
            </div>
          )}
        </div>
        <p className="text-base text-gray-500">価格は {PRICE_MIN}〜{PRICE_MAX.toLocaleString()} 円。</p>
      </fieldset>

      {uploading && <p className="text-base text-gray-600">{uploading}をアップロードしています…</p>}
      {error && <p className="text-base text-red-600" role="alert">{error}</p>}
      {message && <p className="text-base text-green-700" role="status">{message}</p>}

      <div className="flex flex-wrap gap-3">
        {!liveOrReviewing && (
          <button type="button" disabled={busy || !!uploading} onClick={() => save('save')} className="px-6 py-3 rounded-lg border border-gray-300 text-base font-bold text-gray-800 disabled:opacity-50">
            下書き保存
          </button>
        )}
        <button
          type="button"
          disabled={busy || !!uploading}
          onClick={() => save(liveOrReviewing ? 'save' : 'submit')}
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-base font-bold disabled:opacity-50"
        >
          {liveOrReviewing ? '保存してもう一度審査に出す' : '審査に出す'}
        </button>
        {p.id && p.status !== 'archived' && (
          <button type="button" disabled={busy} onClick={() => save('withdraw')} className="px-6 py-3 rounded-lg text-base text-gray-600 underline disabled:opacity-50">
            取り下げる
          </button>
        )}
      </div>
    </div>
  )
}
