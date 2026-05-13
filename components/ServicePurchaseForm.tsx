'use client'

import { useMemo, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  serviceId: string
  serviceType: 'custom_made' | 'reprint'
  unitPrice: number
}

const PRICE_STEP = 500

export default function ServicePurchaseForm({ serviceId, serviceType, unitPrice: minUnitPrice }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    name: '',
    phone: '',
    quantity: 1,
    unitPrice: minUnitPrice,
    notes: '',
  })

  const total = useMemo(() => form.unitPrice * form.quantity, [form.unitPrice, form.quantity])

  function decUnitPrice() {
    setForm((f) => ({ ...f, unitPrice: Math.max(minUnitPrice, f.unitPrice - PRICE_STEP) }))
  }
  function incUnitPrice() {
    setForm((f) => ({ ...f, unitPrice: f.unitPrice + PRICE_STEP }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    if (form.unitPrice < minUnitPrice) {
      setErrorMsg(`単価は最低 ¥${minUnitPrice.toLocaleString()} 以上に設定してください`)
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/services/${serviceId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error || '決済セッションの作成に失敗しました')
        setSubmitting(false)
        return
      }
      const stripe = await stripePromise
      const result = await stripe?.redirectToCheckout({ sessionId: data.sessionId })
      if (result?.error) {
        setErrorMsg(result.error.message || '決済画面への遷移に失敗しました')
        setSubmitting(false)
      }
      // 成功時は Stripe にリダイレクト
    } catch {
      setErrorMsg('通信エラーが発生しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
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
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={1000}
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Math.max(1, Math.min(1000, parseInt(e.target.value) || 1)) })}
              className="w-20 text-center text-lg font-bold border-2 border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, quantity: Math.min(1000, form.quantity + 1) })}
              className="w-10 h-10 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-lg font-bold"
            >
              +
            </button>
            <span className="text-gray-500">個</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ご要望 {serviceType === 'custom_made' && <span className="text-red-500">*</span>}
        </label>
        <textarea
          rows={5}
          required={serviceType === 'custom_made'}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          placeholder={
            serviceType === 'reprint'
              ? '過去にご注文いただいた作品の情報、追加で印刷したい色・サイズなど'
              : 'ご希望のデザイン、サイズ、色、用途など、できるだけ詳しくご記入ください'
          }
        />
        <p className="text-xs text-gray-500 mt-2">
          ※ご要望内容により、追加料金や仕様変更のご相談をさせていただく場合があります。
        </p>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-gray-700">単価</p>
            <p className="text-xs text-gray-500">最低 ¥{minUnitPrice.toLocaleString()} / 500円単位で調整可</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={decUnitPrice}
              disabled={form.unitPrice <= minUnitPrice}
              className="w-9 h-9 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="単価を下げる"
            >
              -
            </button>
            <div className="w-28 text-center">
              <span className="text-lg font-bold text-gray-900">¥{form.unitPrice.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={incUnitPrice}
              className="w-9 h-9 rounded-full border-2 border-gray-300 hover:border-purple-600 transition-colors flex items-center justify-center text-lg font-bold"
              aria-label="単価を上げる"
            >
              +
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-700 mb-3">
          <span>数量</span>
          <span>{form.quantity} 個</span>
        </div>
        <div className="flex items-center justify-between border-t border-purple-200 pt-3">
          <span className="text-lg font-bold text-gray-900">合計</span>
          <span className="text-2xl font-bold text-purple-700">¥{total.toLocaleString()}</span>
        </div>
        {form.unitPrice > minUnitPrice && (
          <p className="text-xs text-purple-700 mt-2">
            最低料金より ¥{(form.unitPrice - minUnitPrice).toLocaleString()} / 個 上乗せされています
          </p>
        )}
      </div>

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
          {submitting ? 'お支払い画面を準備中...' : `¥${total.toLocaleString()} を決済する`}
        </button>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Stripe の安全な決済画面に移動します。
      </p>
    </form>
  )
}
