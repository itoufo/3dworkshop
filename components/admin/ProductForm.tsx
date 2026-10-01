'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingOverlay from '@/components/LoadingOverlay'
import MediaListEditor from '@/components/admin/MediaListEditor'
import { adminJson } from '@/lib/admin-api-client'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { imageUrlsOnly } from '@/lib/media'
import { ArrowLeft, Save, Type, Trash2, Plus, Layers } from 'lucide-react'
import type { Product, ProductSeries } from '@/lib/products'

interface SpecRow {
  key: string
  value: string
}

interface Props {
  product?: Product
}

/** 物販商品の作成・編集フォーム。写真は複数枚アップロードでき、先頭の1枚が一覧・OG画像になる */
export default function ProductForm({ product }: Props) {
  const router = useRouter()
  const isEdit = Boolean(product)

  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)
  // 写真と動画を表示順のまま1本の配列で持つ。先頭がメイン
  const [media, setMedia] = useState<string[]>(
    product?.media_urls?.length ? product.media_urls : (product?.image_urls ?? [])
  )
  // シリーズの子商品にするか。非公開のシリーズも選べるように管理 API から読む
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([])
  const [seriesError, setSeriesError] = useState<string | null>(null)
  const [seriesId, setSeriesId] = useState<string>(product?.series_id ?? '')
  const [variantOptions, setVariantOptions] = useState<Record<string, string>>(product?.variant_options ?? {})
  const [seriesSort, setSeriesSort] = useState<string>(String(product?.series_sort ?? 0))
  const [specs, setSpecs] = useState<SpecRow[]>(
    Object.entries(product?.specifications ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  )
  const [formData, setFormData] = useState({
    name: product?.name ?? '',
    description: product?.description ?? '',
    base_price: product ? String(product.base_price) : '',
    // 空欄 = 在庫管理をしない（受注製作）
    stock_quantity: product?.stock_quantity != null ? String(product.stock_quantity) : '',
    is_active: product?.is_active ?? true,
  })

  useEffect(() => {
    adminJson<{ series: ProductSeries[] }>('/api/admin/product-series').then((res) => {
      if (res.ok) setSeriesList(res.data.series)
      else setSeriesError(res.message)
    })
  }, [])

  const selectedSeries = seriesList.find((s) => s.id === seriesId) ?? null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const price = parseInt(formData.base_price)
    if (!(price >= 0)) {
      alert('価格を正しく入力してください')
      return
    }

    const specifications = specs.reduce<Record<string, string>>((acc, row) => {
      if (row.key.trim()) acc[row.key.trim()] = row.value
      return acc
    }, {})

    // シリーズの子商品なら、軸ごとの値がそろっていないと選択肢に出せない
    const axes = selectedSeries?.option_axes ?? []
    const variant: Record<string, string> = {}
    for (const axis of axes) {
      const value = (variantOptions[axis] ?? '').trim()
      if (!value) {
        alert(`シリーズの「${axis}」を入力してください`)
        return
      }
      variant[axis] = value
    }

    const payload = {
      name: formData.name,
      description: formData.description || null,
      category: 'product',
      base_price: price,
      media_urls: media,
      // 旧カラム。写真だけを入れて過去の参照が壊れないようにしておく
      image_urls: imageUrlsOnly(media),
      specifications,
      is_active: formData.is_active,
      stock_quantity: formData.stock_quantity.trim() === '' ? null : parseInt(formData.stock_quantity) || 0,
      series_id: seriesId || null,
      variant_options: variant,
      series_sort: parseInt(seriesSort) || 0,
    }

    setSaving(true)
    try {
      const { error } = isEdit
        ? await supabase.from('products').update(payload).eq('id', product!.id)
        : await supabase.from('products').insert(payload)

      if (error) throw error

      alert(isEdit ? '商品を更新しました' : '商品を作成しました')
      setNavigating(true)
      router.push('/admin/products')
      router.refresh()
    } catch (error) {
      console.error('Error saving product:', error)
      alert('商品の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {navigating && <LoadingOverlay message="商品管理へ戻っています..." />}
      {saving && <LoadingOverlay message="保存しています..." />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => {
            setNavigating(true)
            router.push('/admin/products')
          }}
          className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          商品管理に戻る
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h2 className="text-2xl font-bold text-white">{isEdit ? '商品を編集' : '新規商品作成'}</h2>
            <p className="text-white/80 mt-1">{SHIPPING_LEAD_TIME_TEXT}する物販商品として公開されます</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-purple-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                  <Type className="w-5 h-5 mr-2 text-purple-600" />
                  基本情報
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品名 *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="オリジナル3Dプリント置物"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">商品説明</label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="素材・サイズ・使い方など"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">価格（税込・円） *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      placeholder="3500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">在庫数</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      placeholder="空欄なら受注製作"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      空欄にすると在庫管理をせず「受注製作」として販売し続けます。数値を入れると購入のたびに自動で減ります。
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded"
                  />
                  <span className="text-gray-900 font-medium">公開する（商品一覧・商品ページに表示）</span>
                </label>
              </div>

              <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-2">
                  <Layers className="w-5 h-5 mr-2 text-indigo-600" />
                  シリーズ（任意）
                </h3>
                <p className="text-sm text-gray-600">
                  シリーズに入れると、この商品は単独のページを持たず、シリーズのページで「
                  {selectedSeries ? selectedSeries.option_axes.join('・') : 'サイズ・色など'}」を選んで買う選択肢の1つになります。
                </p>
                {seriesError && <p className="text-sm text-red-600">シリーズを読み込めませんでした: {seriesError}</p>}
                <select
                  value={seriesId}
                  onChange={(e) => setSeriesId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                >
                  <option value="">シリーズに入れない（単品で販売）</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.is_active ? '' : '（非公開）'}
                    </option>
                  ))}
                </select>

                {selectedSeries && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedSeries.option_axes.map((axis) => (
                      <div key={axis}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{axis} *</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          value={variantOptions[axis] ?? ''}
                          onChange={(e) => setVariantOptions({ ...variantOptions, [axis]: e.target.value })}
                          placeholder={axis === 'サイズ' ? '高さ約10cm' : ''}
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">シリーズ内の並び順</label>
                      <input
                        type="number"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                        value={seriesSort}
                        onChange={(e) => setSeriesSort(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">小さいほど選択肢の前に並びます。</p>
                    </div>
                  </div>
                )}
              </div>

              <MediaListEditor media={media} onChange={setMedia} title="商品写真・動画（複数可）" />

              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">商品仕様（任意）</h3>
                <p className="text-sm text-gray-600">「素材」「サイズ」など、商品ページに表の形で並びます。</p>

                {specs.map((row, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      className="w-40 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={row.key}
                      onChange={(e) => {
                        const next = [...specs]
                        next[index] = { ...row, key: e.target.value }
                        setSpecs(next)
                      }}
                      placeholder="素材"
                    />
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                      value={row.value}
                      onChange={(e) => {
                        const next = [...specs]
                        next[index] = { ...row, value: e.target.value }
                        setSpecs(next)
                      }}
                      placeholder="PLA樹脂"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecs(specs.filter((_, i) => i !== index))}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl"
                      aria-label="この行を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => setSpecs([...specs, { key: '', value: '' }])}
                  className="inline-flex items-center px-4 py-2 text-sm rounded-full border-2 border-gray-300 text-gray-700 hover:border-purple-500"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  項目を追加
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg transition-all duration-300 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEdit ? '更新する' : '作成する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
