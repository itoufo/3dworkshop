'use client'

import { useEffect, useMemo, useState } from 'react'
import ProductGallery from '@/components/ProductGallery'
import ProductBuyBox from '@/components/ProductBuyBox'
import ShareButtons from '@/components/ShareButtons'
import { shippingFeeLabel } from '@/lib/shipping'
import {
  axisValues,
  findItem,
  isAvailable,
  lowestPrice,
  selectValue,
  selectionOf,
  type Selection,
} from '@/lib/product-variants'
import type { Product } from '@/lib/products'

export type DetailItem = Pick<
  Product,
  'id' | 'name' | 'description' | 'base_price' | 'media_urls' | 'specifications' | 'stock_quantity' | 'variant_options'
>

interface Props {
  title: string
  description: string | null
  /** シリーズ共通の写真（単品なら空） */
  sharedMedia: string[]
  /** 選ぶ項目（単品なら空） */
  axes: string[]
  /** 買える商品。単品なら1件 */
  items: DetailItem[]
  shareUrl: string
}

/** 説明文を「段落・箇条書き（・）・注記（※）」に分ける */
function splitDescription(text: string | null) {
  const paragraphs: string[] = []
  const bullets: string[] = []
  const notes: string[] = []
  for (const raw of (text ?? '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('・')) bullets.push(line.slice(1).trim())
    else if (line.startsWith('※')) notes.push(line)
    else paragraphs.push(line)
  }
  return { paragraphs, bullets, notes }
}

/**
 * 商品ページの本体（Amazon 型の3列: 写真 / 商品情報 / 購入ボックス）。単品とシリーズで共通。
 * シリーズでは項目（動物・サイズなど）を選ぶと子商品が決まり、価格・写真・仕様・購入ボックスが切り替わる。
 */
export default function ProductDetailClient({ title, description, sharedMedia, axes, items, shareUrl }: Props) {
  // ⚠ 選んでいる商品は id で持つ。組み合わせから逆引きすると、同じ組み合わせの商品が2つあるときや
  //   項目名を変えて値が古いままのときに、?v= で指した商品とは別の（値段も違う）商品を売ってしまう
  const [currentId, setCurrentId] = useState<string | null>(items[0]?.id ?? null)
  // ?v= が今は選べない商品を指していた（非公開にした・項目の値が欠けた）
  const [missingLink, setMissingLink] = useState(false)
  const current = items.find((i) => i.id === currentId) ?? null
  const selection: Selection = current ? selectionOf(current, axes) : {}

  // ?v=<子商品のid> で開かれたら、その子商品を選んだ状態にする。
  // ⚠ searchParams をサーバーで読むとページが ISR にならないので、ここ（ブラウザ）で読む
  useEffect(() => {
    if (axes.length === 0) return
    const v = new URLSearchParams(window.location.search).get('v')
    if (!v) return
    if (items.some((i) => i.id === v)) {
      setCurrentId(v)
    } else {
      // ⚠ 先頭の商品を勝手に選ばない。注文メールのリンクなどから来た人が、値段の違う別商品を買ってしまう
      setCurrentId(null)
      setMissingLink(true)
    }
  }, [items, axes])

  const values = useMemo(() => axisValues(items, axes), [items, axes])
  const minPrice = lowestPrice(items)
  const { paragraphs, bullets, notes } = useMemo(() => splitDescription(description), [description])

  function choose(axis: string, value: string) {
    // 選んでいる値をもう一度押しても何もしない（同じ組み合わせの別商品に移らないように）
    if (selection[axis] === value) return
    const next = selectValue(items, axes, selection, axis, value)
    const item = findItem(items, axes, next)
    if (item) {
      setCurrentId(item.id)
      setMissingLink(false)
      // 選んだ状態を URL に残す（共有・戻るで同じものが開く）。ページは読み直さない
      const url = new URL(window.location.href)
      url.searchParams.set('v', item.id)
      window.history.replaceState(null, '', url.toString())
    }
  }

  // 子商品の写真を先に、シリーズ共通の写真を後ろに並べる
  const media = [...(current?.media_urls ?? []), ...sharedMedia.filter((u) => !current?.media_urls?.includes(u))]
  const specifications = Object.entries(current?.specifications ?? {}).filter(
    ([, value]) => value !== null && value !== ''
  )
  const priceText = current
    ? `¥${current.base_price.toLocaleString()}`
    : minPrice !== null
      ? `¥${minPrice.toLocaleString()}〜`
      : '—'

  const buyBox = (
    <ProductBuyBox
      productId={current?.id ?? null}
      productName={current?.name ?? null}
      price={current?.base_price ?? null}
      stockQuantity={current?.stock_quantity ?? null}
    />
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      {/* 写真 */}
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          {/* 選んだ商品が変わったら1枚目から見せる */}
          <ProductGallery key={current?.id ?? 'none'} media={media} alt={current?.name ?? title} thumbs="left" />
          <p className="mt-3 text-sm text-gray-500">
            ※ 写真・動画はイメージです。3Dプリント製品のため、色味や積層跡に個体差があります。
          </p>
        </div>
      </div>

      {/* 商品情報 */}
      <div className="lg:col-span-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-2 bg-purple-100 text-purple-700">
          オンラインストア
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">{title}</h1>
        {axes.length > 0 && current && <p className="mt-1 text-base text-gray-600">{current.name}</p>}

        <div className="mt-3 pb-4 border-b border-gray-200">
          <p className="text-3xl font-bold text-gray-900">{priceText}</p>
          <p className="text-sm text-gray-600 mt-1">税込・{shippingFeeLabel()}</p>
        </div>

        {missingLink && (
          <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-base text-amber-800">
            お探しの商品は現在お選びいただけません。下の項目から選び直してください。
          </p>
        )}

        {axes.map((axis) => (
          <fieldset key={axis} className="mt-4">
            <legend className="text-base text-gray-700 mb-2">
              {axis}：<span className="font-semibold text-gray-900">{selection[axis] ?? '未選択'}</span>
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
                    className={`px-3 py-1.5 rounded-lg border-2 text-base transition-colors ${
                      selected
                        ? 'border-purple-600 bg-purple-50 text-purple-800 font-semibold'
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

        {/* スマホでは選んだすぐ下に購入ボックス（PC は右の列） */}
        <div className="mt-5 lg:hidden">{buyBox}</div>

        {(paragraphs.length > 0 || bullets.length > 0) && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">この商品について</h2>
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base text-gray-700 mb-2">
                {p}
              </p>
            ))}
            {bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-base text-gray-700">
                {bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
            {notes.map((n, i) => (
              <p key={i} className="mt-2 text-sm text-gray-500">
                {n}
              </p>
            ))}
          </div>
        )}

        {current?.description && axes.length > 0 && (
          <p className="mt-4 text-base text-gray-700 whitespace-pre-line">{current.description}</p>
        )}

        {specifications.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">商品仕様</h2>
            <dl className="divide-y divide-gray-100 border-y border-gray-100">
              {specifications.map(([key, value]) => (
                <div key={key} className="py-2 grid grid-cols-[7rem_1fr] gap-3">
                  <dt className="text-sm text-gray-500">{key}</dt>
                  <dd className="text-base text-gray-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="mt-6">
          <ShareButtons url={shareUrl} title={title} />
        </div>
      </div>

      {/* 購入ボックス（PC） */}
      <div className="hidden lg:block lg:col-span-3">
        <div className="lg:sticky lg:top-24">{buyBox}</div>
      </div>
    </div>
  )
}
