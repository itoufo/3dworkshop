'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Download, Package, ShieldCheck, ShoppingCart } from 'lucide-react'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { STORE_DOWNLOAD_MAX_COUNT, STORE_DOWNLOAD_VALID_DAYS } from '@/lib/store/download-limits'
import { findItem, selectValue, selectionOf, type Selection } from '@/lib/product-variants'
import { asVariantItems, variantName, type StoreVariant } from '@/lib/store/variants'
import { addToStoreCart } from '@/lib/store/cart'
import { STORE_CART_MAX_QUANTITY } from '@/lib/store/cart-limits'
import VariantPicker from './VariantPicker'

interface Props {
  productId: string
  title: string
  dataPrice: number | null
  printPrice: number | null
  printSpec: string | null
  /** 完成品の選択肢。使わない作品は空 */
  axes: string[]
  variants: StoreVariant[]
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

/**
 * 作品ページの購入ボックス（本サイトの ProductBuyBox と同じ「カートに入れる / 今すぐ買う」）。
 * 買い方（データ / 完成品）と、完成品なら組み合わせ・数量を選ぶ。お名前・メールはカートの画面で入れる。
 * 価格はここでは表示だけ。決済の金額は API が作品の値から決める。
 */
export default function StoreBuyForm({ productId, title, dataPrice, printPrice, printSpec, axes, variants }: Props) {
  const router = useRouter()
  const items = useMemo(() => asVariantItems(variants), [variants])
  const withVariants = axes.length > 0 && items.length > 0
  const [selection, setSelection] = useState<Selection>(() => (withVariants ? selectionOf(items[0], axes) : {}))
  const variant = withVariants ? findItem(items, axes, selection) : null
  const minVariantPrice = withVariants ? Math.min(...items.map((v) => v.price)) : null
  const options = [
    ...(dataPrice != null ? [{ kind: 'data' as const, price: dataPrice }] : []),
    ...(printPrice != null ? [{ kind: 'print' as const, price: variant?.price ?? printPrice }] : []),
  ]
  const [kind, setKind] = useState<'data' | 'print'>(options[0]?.kind ?? 'data')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [going, setGoing] = useState(false)

  if (options.length === 0) return null
  const selected = options.find((o) => o.kind === kind) ?? options[0]
  const ready = !(kind === 'print' && withVariants && !variant)

  function add(): boolean {
    if (!ready) return false
    try {
      const inCart = addToStoreCart(
        { productId, kind, variantId: kind === 'print' ? (variant?.id ?? null) : null },
        kind === 'print' ? quantity : 1,
      )
      const label = `${title}（${kind === 'data' ? '3D データ' : variant ? `完成品・${variantName(variant, axes)}` : '完成品'}）`
      setAdded(kind === 'data' ? label : `${label}（カートに ${inCart.quantity} 個）`)
      setError(
        inCart.capped
          ? kind === 'data'
            ? '3D データはすでにカートに入っています（1つで十分です）'
            : `1つの組み合わせは ${STORE_CART_MAX_QUANTITY} 個までのため、カートには ${inCart.quantity} 個まで入れています`
          : null,
      )
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'カートに入れられませんでした')
      return false
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-base font-medium text-gray-900 mb-1">買い方を選ぶ</legend>
        {options.map((o) => (
          <label
            key={o.kind}
            className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer ${
              kind === o.kind ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={o.kind}
              checked={kind === o.kind}
              onChange={() => {
                setKind(o.kind)
                setAdded(null)
              }}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="flex items-center justify-between">
                <span className="flex items-center font-medium text-gray-900">
                  {o.kind === 'data' ? <Download className="w-4 h-4 mr-1.5" /> : <Package className="w-4 h-4 mr-1.5" />}
                  {o.kind === 'data' ? '3D データ' : '完成品（3DLab が印刷してお届け）'}
                </span>
                <span className="font-bold text-gray-900">
                  {o.kind === 'print' && withVariants && kind !== 'print' && minVariantPrice != null ? `${yen(minVariantPrice)}〜` : yen(o.price)}
                </span>
              </span>
              <span className="block text-sm text-gray-600 mt-0.5">
                {o.kind === 'data'
                  ? `お支払い後すぐにダウンロードできます（${STORE_DOWNLOAD_VALID_DAYS}日間・${STORE_DOWNLOAD_MAX_COUNT}回まで）。ご自分の3Dプリンターで印刷できます。`
                  : `${SHIPPING_LEAD_TIME_TEXT}・送料無料（全国一律）${printSpec ? `。${printSpec}` : ''}`}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      {kind === 'print' && withVariants && (
        <VariantPicker
          axes={axes}
          variants={variants}
          selection={selection}
          onChoose={(axis, value) => {
            setSelection(selectValue(items, axes, selection, axis, value))
            setAdded(null)
          }}
        />
      )}

      {kind === 'print' && (
        <label className="flex items-center gap-3 text-base text-gray-700">
          数量
          <select
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            {Array.from({ length: STORE_CART_MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="text-3xl font-bold text-gray-900">
        {yen(selected.price * (kind === 'print' ? quantity : 1))}
        <span className="ml-2 text-sm font-normal text-gray-600">税込・送料無料</span>
      </p>

      <button
        type="button"
        disabled={!ready}
        onClick={add}
        className="w-full py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition-colors inline-flex items-center justify-center disabled:opacity-60"
      >
        <ShoppingCart className="w-5 h-5 mr-2" />
        カートに入れる
      </button>
      <button
        type="button"
        disabled={!ready || going}
        onClick={() => {
          if (!add()) return
          setGoing(true)
          router.push('/cart')
        }}
        className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-60"
      >
        今すぐ買う
      </button>

      {added && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-base text-green-800">
          <p className="flex items-center font-medium">
            <Check className="w-4 h-4 mr-1" />
            カートに入れました
          </p>
          <p className="text-sm text-green-700 mt-0.5">{added}</p>
          <Link href="/cart" className="inline-block mt-2 text-purple-700 font-medium underline underline-offset-2">
            カートを見る →
          </Link>
        </div>
      )}
      {error && <p className="text-base text-red-600">{error}</p>}

      <p className="flex items-start text-sm text-gray-500">
        <ShieldCheck className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-purple-600" />
        お支払いは Stripe の安全な決済画面で。カード情報は当社に保存されません。
        {kind === 'print' && ' お届け先も決済画面でご入力いただきます。'}
      </p>
    </div>
  )
}
