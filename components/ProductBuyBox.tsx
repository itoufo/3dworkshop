'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addToCart, MAX_LINE_QUANTITY } from '@/lib/cart'
import { SHIPPING_LEAD_TIME_TEXT, shippingFeeLabel } from '@/lib/shipping'
import { ShieldCheck, ShoppingCart, Check } from 'lucide-react'

interface Props {
  /** 買う商品（シリーズなら選んだ子商品）。未選択なら null */
  productId: string | null
  productName: string | null
  price: number | null
  stockQuantity: number | null
}

/**
 * 商品ページ右の購入ボックス（Amazon の「カートに入れる / 今すぐ買う」）。
 * お名前・メールはカートの画面で入れるので、ここには数量とボタンだけを置く。
 */
export default function ProductBuyBox({ productId, productName, price, stockQuantity }: Props) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [going, setGoing] = useState(false)

  const maxQuantity = stockQuantity === null ? MAX_LINE_QUANTITY : Math.min(MAX_LINE_QUANTITY, stockQuantity)
  const soldOut = stockQuantity !== null && stockQuantity <= 0

  // 別の商品を選び直したら、数量と「入れました」の表示をその商品に合わせる
  useEffect(() => {
    setAdded(false)
    setError(null)
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, maxQuantity))))
  }, [productId, maxQuantity])

  function add(): boolean {
    if (!productId) return false
    try {
      const inCart = addToCart(productId, quantity, stockQuantity === null ? undefined : maxQuantity)
      setError(
        inCart.capped ? `在庫が残り ${maxQuantity} 点のため、カートには ${inCart.quantity} 点まで入れています` : null
      )
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'カートに入れられませんでした')
      return false
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-3xl font-bold text-gray-900">{price !== null ? `¥${price.toLocaleString()}` : '—'}</p>
        <p className="text-sm text-gray-600 mt-1">税込・{shippingFeeLabel()}</p>
      </div>

      <div className="text-base text-gray-700 space-y-1">
        <p>
          <span className="font-medium text-gray-900">{SHIPPING_LEAD_TIME_TEXT}</span>
          <span className="block text-sm text-gray-500">1点ずつ3Dプリンタで製作してお届けします</span>
        </p>
        <p
          className={`font-medium ${
            soldOut ? 'text-red-600' : stockQuantity !== null && stockQuantity <= 3 ? 'text-amber-700' : 'text-green-700'
          }`}
        >
          {!productId
            ? '組み合わせを選んでください'
            : soldOut
              ? '売り切れ'
              : stockQuantity === null
                ? '受注製作'
                : `在庫あり（残り ${stockQuantity} 点）`}
        </p>
      </div>

      {productId && !soldOut && (
        <>
          <label className="flex items-center gap-3 text-base text-gray-700">
            数量
            <select
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
            >
              {Array.from({ length: Math.max(1, maxQuantity) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setAdded(add())}
            className="w-full py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition-colors inline-flex items-center justify-center"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            カートに入れる
          </button>
          <button
            type="button"
            disabled={going}
            onClick={() => {
              if (!add()) return
              setGoing(true)
              router.push('/cart')
            }}
            className="w-full py-3 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-60"
          >
            今すぐ買う
          </button>
        </>
      )}

      {added && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-base text-green-800">
          <p className="flex items-center font-medium">
            <Check className="w-4 h-4 mr-1" />
            カートに入れました
          </p>
          {productName && <p className="text-sm text-green-700 mt-0.5">{productName} × {quantity}</p>}
          <Link href="/cart" className="inline-block mt-2 text-purple-700 font-medium underline underline-offset-2">
            カートを見る →
          </Link>
        </div>
      )}
      {error && <p className="text-base text-red-600">{error}</p>}

      <p className="flex items-start text-sm text-gray-500">
        <ShieldCheck className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-purple-600" />
        お支払いは Stripe の安全な決済画面で。カード情報は当社に保存されません。お届け先も決済画面でご入力いただきます。
      </p>
    </div>
  )
}
