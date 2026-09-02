'use client'

import { useState } from 'react'
import RememberCustomerInfo from '@/components/RememberCustomerInfo'
import { useCustomerProfile } from '@/lib/use-customer-profile'
import { SHIPPING_FEE, SHIPPING_LEAD_TIME_TEXT, shippingFeeLabel } from '@/lib/shipping'

interface Props {
  productId: string
  unitPrice: number
  stockQuantity: number | null
}

export default function ProductPurchaseForm({ productId, unitPrice, stockQuantity }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    quantity: 1,
    notes: '',
  })

  const { remember, setRemember, hasSaved, persist, forget } = useCustomerProfile((saved) => {
    setForm((f) => ({
      ...f,
      name: saved.name ?? f.name,
      email: saved.email ?? f.email,
      phone: saved.phone ?? f.phone,
    }))
  })

  // stock_quantity が null の商品は在庫無制限（受注生産）として扱う
  const maxQuantity = stockQuantity === null ? 20 : Math.min(20, stockQuantity)
  const soldOut = stockQuantity !== null && stockQuantity <= 0
  const total = unitPrice * form.quantity + SHIPPING_FEE

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    persist({ name: form.name, email: form.email, phone: form.phone })
    setSubmitting(true)
    try {
      const res = await fetch(`/api/products/${productId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setErrorMsg(data.error || '決済セッションの作成に失敗しました')
        setSubmitting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setErrorMsg('通信エラーが発生しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
  }

  if (soldOut) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <p className="text-lg font-bold text-gray-700 mb-1">売り切れました</p>
        <p className="text-base text-gray-600">再入荷のご相談はお問い合わせください。</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">電話番号</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            数量 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, quantity: Math.max(1, form.quantity - 1) })}
              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-lg font-bold"
              aria-label="数量を減らす"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={maxQuantity}
              required
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)) })
              }
              className="w-20 text-center text-lg font-bold border-2 border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, quantity: Math.min(maxQuantity, form.quantity + 1) })}
              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-lg font-bold"
              aria-label="数量を増やす"
            >
              +
            </button>
            <span className="text-gray-500">点</span>
          </div>
          {stockQuantity !== null && (
            <p className="text-sm text-gray-500 mt-2">残り {stockQuantity} 点</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">ご要望・備考</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          placeholder="色や仕様のご希望、配送日のご相談など"
        />
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5">
        <div className="flex items-center justify-between text-base text-gray-700 mb-2">
          <span>商品代金（税込）</span>
          <span>¥{unitPrice.toLocaleString()} × {form.quantity} 点</span>
        </div>
        <div className="flex items-center justify-between text-base text-gray-700 mb-3">
          <span>送料</span>
          <span>{SHIPPING_FEE > 0 ? `¥${SHIPPING_FEE.toLocaleString()}` : '無料'}</span>
        </div>
        <div className="flex items-center justify-between border-t border-purple-200 pt-3">
          <span className="text-lg font-bold text-gray-900">合計</span>
          <span className="text-2xl font-bold text-purple-700">¥{total.toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          {SHIPPING_LEAD_TIME_TEXT}します。{shippingFeeLabel()}。
        </p>
      </div>

      <RememberCustomerInfo
        remember={remember}
        onChange={setRemember}
        hasSaved={hasSaved}
        onForget={forget}
      />

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="flex justify-center pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'お支払い画面を準備中...' : `¥${total.toLocaleString()} を購入する`}
        </button>
      </div>
      <p className="text-sm text-gray-500 text-center">
        次の画面（Stripe）でお届け先とカード情報をご入力いただきます。
      </p>
    </form>
  )
}
