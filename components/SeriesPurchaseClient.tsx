'use client'

import { useEffect, useMemo, useState } from 'react'
import ProductGallery from '@/components/ProductGallery'
import ProductPurchaseForm from '@/components/ProductPurchaseForm'
import ShareButtons from '@/components/ShareButtons'
import { SHIPPING_LEAD_TIME_TEXT, shippingFeeLabel } from '@/lib/shipping'
import {
  axisValues,
  findItem,
  isAvailable,
  lowestPrice,
  selectValue,
  selectionOf,
  type Selection,
} from '@/lib/product-variants'
import { Truck, Package, ShieldCheck } from 'lucide-react'
import type { Product } from '@/lib/products'

export type SeriesItem = Pick<
  Product,
  'id' | 'name' | 'description' | 'base_price' | 'media_urls' | 'specifications' | 'stock_quantity' | 'variant_options'
>

interface Props {
  seriesName: string
  seriesDescription: string | null
  seriesMedia: string[]
  axes: string[]
  items: SeriesItem[]
  shareUrl: string
}

/**
 * シリーズのページの本体。項目（動物・サイズなど）を選ぶと子商品が決まり、
 * 価格・写真・仕様・購入フォームがその子商品に切り替わる。決済は子商品の既存の口をそのまま使う。
 */
export default function SeriesPurchaseClient({
  seriesName,
  seriesDescription,
  seriesMedia,
  axes,
  items,
  shareUrl,
}: Props) {
  const [selection, setSelection] = useState<Selection>(() => (items[0] ? selectionOf(items[0], axes) : {}))

  // ?v=<子商品のid> で開かれたら、その子商品を選んだ状態にする。
  // ⚠ searchParams をサーバーで読むとページが ISR にならないので、ここ（ブラウザ）で読む
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('v')
    const item = v ? items.find((i) => i.id === v) : null
    if (item) setSelection(selectionOf(item, axes))
  }, [items, axes])

  const values = useMemo(() => axisValues(items, axes), [items, axes])
  const current = findItem(items, axes, selection)
  const minPrice = lowestPrice(items)

  function choose(axis: string, value: string) {
    const next = selectValue(items, axes, selection, axis, value)
    setSelection(next)
    const item = findItem(items, axes, next)
    if (item) {
      // 選んだ状態を URL に残す（共有・戻るで同じものが開く）。ページは読み直さない
      const url = new URL(window.location.href)
      url.searchParams.set('v', item.id)
      window.history.replaceState(null, '', url.toString())
    }
  }

  // 子商品の写真を先に、シリーズ共通の写真を後ろに並べる
  const media = [...(current?.media_urls ?? []), ...seriesMedia.filter((u) => !current?.media_urls?.includes(u))]
  const inStock = current ? current.stock_quantity === null || current.stock_quantity > 0 : false
  const specifications = Object.entries(current?.specifications ?? {}).filter(
    ([, value]) => value !== null && value !== ''
  )

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          {/* 選んだ商品が変わったら1枚目から見せる */}
          <ProductGallery key={current?.id ?? 'none'} media={media} alt={current?.name ?? seriesName} />
          <p className="mt-3 text-base text-gray-500">
            ※ 写真・動画はイメージです。3Dプリント製品のため、色味や積層跡に個体差があります。
          </p>
        </div>

        <div>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-100 text-purple-700">
            オンラインストア
          </span>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{seriesName}</h1>
          {seriesDescription && <p className="text-gray-700 whitespace-pre-line mb-6">{seriesDescription}</p>}

          {axes.map((axis) => (
            <fieldset key={axis} className="mb-5">
              <legend className="text-base font-medium text-gray-900 mb-2">
                {axis}
                {selection[axis] && <span className="ml-2 text-gray-600 font-normal">{selection[axis]}</span>}
              </legend>
              <div className="flex flex-wrap gap-2">
                {values[axis].map((value) => {
                  const selected = selection[axis] === value
                  const available = isAvailable(items, axes, selection, axis, value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => choose(axis, value)}
                      aria-pressed={selected}
                      title={available ? undefined : `${value} はいまの組み合わせにはありません（選ぶと他の項目を合わせます）`}
                      className={`px-4 py-2 rounded-full border-2 text-base transition-colors ${
                        selected
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : available
                            ? 'border-gray-200 bg-white text-gray-800 hover:border-purple-400'
                            : 'border-dashed border-gray-200 bg-white text-gray-400 hover:border-purple-300'
                      }`}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ))}

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-4">
            <p className="text-sm text-gray-600 mb-1">価格（税込）</p>
            <p className="text-3xl font-bold text-gray-900">
              {current ? `¥${current.base_price.toLocaleString()}` : minPrice !== null ? `¥${minPrice.toLocaleString()}〜` : '—'}
            </p>
            <p className="text-sm text-gray-600 mt-2">{shippingFeeLabel()}</p>
          </div>

          <div className="bg-white rounded-xl p-5 space-y-3 mb-4">
            <div className="flex items-start">
              <Truck className="w-5 h-5 text-purple-600 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{SHIPPING_LEAD_TIME_TEXT}</p>
                <p className="text-base text-gray-600">1点ずつ3Dプリンタで製作するため、お届けまでお時間をいただきます。</p>
              </div>
            </div>
            <div className="flex items-start">
              <Package className="w-5 h-5 text-purple-600 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">
                  {!current
                    ? '組み合わせを選んでください'
                    : current.stock_quantity === null
                      ? '受注製作'
                      : inStock
                        ? `在庫あり（残り ${current.stock_quantity} 点）`
                        : '売り切れ'}
                </p>
                <p className="text-base text-gray-600">お届け先は決済画面でご入力いただきます。</p>
              </div>
            </div>
            <div className="flex items-start">
              <ShieldCheck className="w-5 h-5 text-purple-600 mr-3 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Stripe による安全な決済</p>
                <p className="text-base text-gray-600">カード情報が当社に保存されることはありません。</p>
              </div>
            </div>
          </div>

          <ShareButtons url={shareUrl} title={seriesName} />
        </div>
      </div>

      {current?.description && (
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{current.name}</h2>
          <p className="text-gray-700 whitespace-pre-line">{current.description}</p>
        </div>
      )}

      {specifications.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">商品仕様</h2>
          <dl className="divide-y divide-gray-100">
            {specifications.map(([key, value]) => (
              <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-baseline">
                <dt className="w-40 shrink-0 text-gray-500">{key}</dt>
                <dd className="text-gray-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">この商品を購入する</h2>
        {current ? (
          <>
            <p className="text-gray-600 mb-6">
              選んだ商品: <span className="font-medium text-gray-900">{current.name}</span>
              <br />
              数量をお選びのうえ、決済画面でお届け先をご入力ください。{SHIPPING_LEAD_TIME_TEXT}します。
            </p>
            {/* ⚠ key を付けない。選び直しで名前・メールの入力が消えないようにする */}
            <ProductPurchaseForm
              productId={current.id}
              unitPrice={current.base_price}
              stockQuantity={current.stock_quantity}
            />
          </>
        ) : (
          <p className="text-gray-600">上で{axes.join('・')}を選んでください。</p>
        )}
      </div>
    </>
  )
}
