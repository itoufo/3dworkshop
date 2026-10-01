'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart, setCartQuantity, removeFromCart, rememberCheckout, MAX_LINE_QUANTITY } from '@/lib/cart'
import { useCustomerProfile } from '@/lib/use-customer-profile'
import RememberCustomerInfo from '@/components/RememberCustomerInfo'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { firstImageUrl } from '@/lib/media'
import { SHIPPING_FEE, SHIPPING_LEAD_TIME_TEXT, shippingFeeLabel } from '@/lib/shipping'
import { Package, ShoppingCart, Trash2, ShieldCheck } from 'lucide-react'

interface CartProduct {
  id: string
  name: string
  base_price: number
  media_urls: string[] | null
  stock_quantity: number | null
  is_active: boolean
  category: string
}

/**
 * カートの画面。左に中身、右に合計とお客さま情報（Amazon と同じ2列）。
 * 表示用の値段はここで読むが、決済の金額は API が DB から取り直す。
 */
export default function CartClient() {
  const { lines, ready } = useCart()
  const [products, setProducts] = useState<Record<string, CartProduct>>({})
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** どの商品の組み合わせまで読み込み済みか。カートに入れたばかりの商品を「販売していません」と見せないため */
  const [fetchedIds, setFetchedIds] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [problemId, setProblemId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })

  const { remember, setRemember, hasSaved, persist, forget, fromAccount } = useCustomerProfile((saved) => {
    setForm((f) => ({
      ...f,
      name: saved.name ?? f.name,
      email: saved.email ?? f.email,
      phone: saved.phone ?? f.phone,
    }))
  })

  const ids = useMemo(() => lines.map((l) => l.productId).sort().join(','), [lines])
  useEffect(() => {
    if (!ready) return
    if (!ids) {
      setLoaded(true)
      return
    }
    // ⚠ 古い問い合わせの返事が後から届いても使わない（別タブで商品が増えたときなど）
    let cancelled = false
    supabase
      .from('products')
      .select('id, name, base_price, media_urls, stock_quantity, is_active, category')
      .in('id', ids.split(','))
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // 読めなかったのを「販売していません」と見せない（読み込み済みにしない）
          setLoadError('商品情報を読み込めませんでした。ページを開き直してください。')
        } else {
          setLoadError(null)
          setProducts(Object.fromEntries(((data as CartProduct[]) ?? []).map((p) => [p.id, p])))
          setFetchedIds(ids)
        }
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [ids, ready])

  // 在庫を超えて入っている数量は在庫の数に合わせる（数量の欄では同じ値を選び直せないため）
  useEffect(() => {
    for (const line of lines) {
      const stock = products[line.productId]?.stock_quantity
      if (stock !== null && stock !== undefined && stock > 0 && line.quantity > stock) {
        setCartQuantity(line.productId, stock)
      }
    }
  }, [lines, products])

  const rows = lines.map((line) => {
    const product = products[line.productId]
    // まだ読み込んでいない（いま入れたばかりの）商品を「販売していません」と見せない
    const loading = !product && fetchedIds !== ids
    const unavailable = !loading && (!product || !product.is_active || product.category !== 'product')
    const soldOut = product?.stock_quantity !== null && product?.stock_quantity !== undefined && product.stock_quantity < line.quantity
    return { line, product, unavailable, soldOut, loading }
  })
  const buyable = rows.filter((r) => !r.loading && !r.unavailable && !r.soldOut)
  const blocked = rows.some((r) => r.unavailable || r.soldOut)
  const anyLoading = rows.some((r) => r.loading)
  const subtotal = buyable.reduce((sum, r) => sum + r.product!.base_price * r.line.quantity, 0)
  const itemCount = buyable.reduce((sum, r) => sum + r.line.quantity, 0)
  const total = subtotal + (buyable.length > 0 ? SHIPPING_FEE : 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setProblemId(null)
    persist({ name: form.name, email: form.email, phone: form.phone })
    setSubmitting(true)
    const submitted = buyable.map((r) => ({ productId: r.line.productId, quantity: r.line.quantity }))
    try {
      const res = await fetch('/api/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: submitted,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setErrorMsg(data.error || '決済の準備に失敗しました')
        if (data.productId) setProblemId(data.productId)
        setSubmitting(false)
        return
      }
      if (data.checkoutId) rememberCheckout(data.checkoutId, submitted)
      window.location.href = data.url
    } catch {
      setErrorMsg('通信エラーが発生しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
  }

  if (!ready || (lines.length > 0 && !loaded)) {
    return <div className="py-20 text-center text-gray-500">カートを読み込んでいます...</div>
  }

  if (lines.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-lg text-gray-700 mb-6">カートは空です</p>
        <Link
          href="/products"
          className="inline-block px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all"
        >
          商品を見る
        </Link>
      </div>
    )
  }

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      <section className="lg:col-span-8 bg-white rounded-2xl shadow-sm p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 pb-4 border-b border-gray-200">ショッピングカート</h1>
        <ul className="divide-y divide-gray-100">
          {rows.map(({ line, product, unavailable, soldOut, loading }) => {
            const image = firstImageUrl(product?.media_urls)
            const max = product?.stock_quantity == null ? MAX_LINE_QUANTITY : Math.max(1, Math.min(MAX_LINE_QUANTITY, product.stock_quantity))
            return (
              <li
                key={line.productId}
                className={`py-4 flex gap-4 ${problemId === line.productId ? 'bg-red-50 -mx-2 px-2 rounded-lg' : ''}`}
              >
                <Link
                  href={`/products/${line.productId}`}
                  className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100"
                >
                  {image ? (
                    <Image src={optimizeImageUrl(image, 60)} alt={product?.name ?? '商品'} fill className="object-cover" sizes="96px" />
                  ) : (
                    <Package className="w-8 h-8 text-purple-300 absolute inset-0 m-auto" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${line.productId}`} className="text-base font-medium text-gray-900 hover:text-purple-700">
                    {product?.name ?? (loading ? '…' : 'この商品は表示できません')}
                  </Link>
                  {loading ? (
                    <p className="text-base text-gray-500 mt-1">読み込んでいます...</p>
                  ) : unavailable ? (
                    <p className="text-base text-red-600 mt-1">現在は販売していません。カートから外してください。</p>
                  ) : soldOut ? (
                    <p className="text-base text-red-600 mt-1">
                      {product!.stock_quantity! <= 0 ? '売り切れました' : `在庫が残り ${product!.stock_quantity} 点です`}
                    </p>
                  ) : (
                    <p className="text-sm text-green-700 mt-1">
                      {product!.stock_quantity === null ? '受注製作' : '在庫あり'}・{SHIPPING_LEAD_TIME_TEXT}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    {!unavailable && (
                      <label className="flex items-center gap-2 text-base text-gray-700">
                        数量
                        <select
                          value={Math.min(line.quantity, max)}
                          onChange={(e) => setCartQuantity(line.productId, parseInt(e.target.value) || 1)}
                          className="px-2 py-1 border border-gray-300 rounded-lg bg-white text-gray-900"
                        >
                          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromCart(line.productId)}
                      className="inline-flex items-center text-base text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      削除
                    </button>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900 whitespace-nowrap">
                  {product && !unavailable ? `¥${(product.base_price * line.quantity).toLocaleString()}` : '—'}
                </p>
              </li>
            )
          })}
        </ul>
        <p className="pt-4 border-t border-gray-200 text-right text-lg text-gray-900">
          小計（{itemCount} 点）: <span className="font-bold">¥{subtotal.toLocaleString()}</span>
        </p>
      </section>

      <aside className="lg:col-span-4">
        <form onSubmit={handleSubmit} className="lg:sticky lg:top-24 bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div className="space-y-1 text-base">
            <p className="flex justify-between text-gray-700">
              <span>商品（{itemCount} 点）</span>
              <span>¥{subtotal.toLocaleString()}</span>
            </p>
            <p className="flex justify-between text-gray-700">
              <span>送料</span>
              <span>{SHIPPING_FEE > 0 ? `¥${SHIPPING_FEE.toLocaleString()}` : '無料'}</span>
            </p>
            <p className="flex justify-between pt-2 border-t border-gray-200 text-lg font-bold text-gray-900">
              <span>ご請求額</span>
              <span>¥{total.toLocaleString()}</span>
            </p>
            <p className="text-sm text-gray-500">税込・{shippingFeeLabel()}</p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              お名前 <span className="text-red-500">*</span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={`${inputClass} mt-1`}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`${inputClass} mt-1`}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              電話番号
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`${inputClass} mt-1`}
                autoComplete="tel"
              />
            </label>
            <details>
              <summary className="cursor-pointer text-base text-purple-700">ご要望を書く（任意）</summary>
              <textarea
                rows={3}
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={`${inputClass} mt-2`}
                placeholder="配送日のご相談など"
              />
            </details>
          </div>

          <RememberCustomerInfo
            remember={remember}
            onChange={setRemember}
            hasSaved={hasSaved}
            onForget={() => {
              forget()
              setForm({ ...form, name: '', email: '', phone: '' })
            }}
            fromAccount={fromAccount}
          />

          {loadError && <p className="text-base text-red-600">{loadError}</p>}
          {blocked && (
            <p className="text-base text-red-600">販売していない・在庫が足りない商品があります。カートから外すと、残りの商品で進めます。</p>
          )}
          {errorMsg && <p className="text-base text-red-600">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting || buyable.length === 0 || blocked || anyLoading || Boolean(loadError)}
            className="w-full py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? '決済画面へ移動しています...' : 'レジに進む（お支払いへ）'}
          </button>
          <p className="flex items-start text-sm text-gray-500">
            <ShieldCheck className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-purple-600" />
            次の画面（Stripe）で、お届け先とカード情報をご入力いただきます。カード情報は当社に保存されません。
          </p>
        </form>
      </aside>
    </div>
  )
}
