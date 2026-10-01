'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LoadingOverlay from '@/components/LoadingOverlay'
import MediaListEditor from '@/components/admin/MediaListEditor'
import { adminJson } from '@/lib/admin-api-client'
import { SLUG_PATTERN } from '@/lib/product-series-input'
import { ArrowLeft, Save, Layers, Plus, Trash2 } from 'lucide-react'
import type { ProductSeries } from '@/lib/products'

interface Props {
  series?: ProductSeries
}

/**
 * 物販シリーズの作成・編集フォーム。
 * シリーズは「1ページで選んで買う」ための親。子商品は商品フォームでこのシリーズを選んで作る。
 */
export default function SeriesForm({ series }: Props) {
  const router = useRouter()
  const isEdit = Boolean(series)

  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [media, setMedia] = useState<string[]>(series?.media_urls ?? [])
  const [axes, setAxes] = useState<string[]>(series?.option_axes?.length ? series.option_axes : ['サイズ'])
  const [formData, setFormData] = useState({
    name: series?.name ?? '',
    slug: series?.slug ?? '',
    description: series?.description ?? '',
    sort_order: String(series?.sort_order ?? 0),
    // 作った直後は非公開。子商品と写真をそろえてから公開する
    is_active: series?.is_active ?? false,
  })

  function backToList() {
    setNavigating(true)
    router.push('/admin/product-series')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!SLUG_PATTERN.test(formData.slug.trim())) {
      alert('URL 用の名前（slug）は半角の小文字・数字・ハイフンだけで入れてください')
      return
    }

    setSaving(true)
    const res = await adminJson<{ series: ProductSeries; incomplete_items?: number }>(
      isEdit ? `/api/admin/product-series/${series!.id}` : '/api/admin/product-series',
      {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug.trim(),
          description: formData.description,
          media_urls: media,
          option_axes: axes,
          sort_order: parseInt(formData.sort_order) || 0,
          is_active: formData.is_active,
        }),
      },
    )
    setSaving(false)

    if (!res.ok) {
      alert(res.message)
      return
    }
    const incomplete = res.data.incomplete_items ?? 0
    alert(
      (isEdit ? 'シリーズを更新しました' : 'シリーズを作成しました') +
        (incomplete > 0
          ? `\n\n項目の値が入っていない商品が ${incomplete} 件あります。お客さまはその商品を選べません。商品管理で値を入れてください。`
          : '')
    )
    backToList()
    router.refresh()
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900'

  return (
    <>
      {navigating && <LoadingOverlay message="シリーズ一覧へ戻っています..." />}
      {saving && <LoadingOverlay message="保存しています..." />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={backToList}
          className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          シリーズ一覧に戻る
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h2 className="text-2xl font-bold text-white">{isEdit ? 'シリーズを編集' : '新規シリーズ作成'}</h2>
            <p className="text-white/80 mt-1">
              シリーズのページで、お客さまが「{axes.filter(Boolean).join('・') || 'サイズ・色など'}」を選んで購入します
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="bg-purple-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-2">
                <Layers className="w-5 h-5 mr-2 text-purple-600" />
                基本情報
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">シリーズ名 *</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ぬりっこアニマル"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL 用の名前（slug）*</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="nurikko-animal"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ページの URL は /products/series/{formData.slug || 'slug'} になります。半角の小文字・数字・ハイフン。
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">シリーズの説明</label>
                <textarea
                  rows={6}
                  className={inputClass}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">並び順</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 text-purple-600 rounded"
                />
                <span className="text-gray-900 font-medium">公開する（商品一覧・シリーズページに表示）</span>
              </label>
            </div>

            <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">お客さまが選ぶ項目 *</h3>
              <p className="text-sm text-gray-600">
                例: 「動物」「サイズ」「色」。この順にページへ並びます。各商品には、商品フォームでこの項目ごとの値を入れます。
              </p>
              {axes.map((axis, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    className={inputClass}
                    value={axis}
                    onChange={(e) => {
                      const next = [...axes]
                      next[index] = e.target.value
                      setAxes(next)
                    }}
                    placeholder="サイズ"
                  />
                  <button
                    type="button"
                    onClick={() => setAxes(axes.filter((_, i) => i !== index))}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl"
                    aria-label="この項目を削除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {axes.length < 5 && (
                <button
                  type="button"
                  onClick={() => setAxes([...axes, ''])}
                  className="inline-flex items-center px-4 py-2 text-sm rounded-full border-2 border-gray-300 text-gray-700 hover:border-purple-500"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  項目を追加
                </button>
              )}
              {isEdit && (
                <p className="text-xs text-amber-700">
                  項目の名前を変えると、各商品に入っている値とつながらなくなります。変えたときは商品側の値も入れ直してください。
                </p>
              )}
            </div>

            <MediaListEditor media={media} onChange={setMedia} title="シリーズの写真・動画（複数可）" />

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
    </>
  )
}
