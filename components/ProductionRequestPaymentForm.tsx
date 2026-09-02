'use client'

import { useState } from 'react'
import RememberCustomerInfo from '@/components/RememberCustomerInfo'
import { useCustomerProfile } from '@/lib/use-customer-profile'

// 金額の目安。下限ではなく画面に出す案内で、実際の下限は API 側の MIN_AMOUNT。
const SUGGESTED_MIN_AMOUNT = 5000
const QUICK_AMOUNTS = [5000, 10000, 20000, 30000]

export default function ProductionRequestPaymentForm() {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    amount: '',
    details: '',
  })

  const { remember, setRemember, hasSaved, persist, forget } = useCustomerProfile((saved) => {
    setForm((f) => ({
      ...f,
      name: saved.name ?? f.name,
      email: saved.email ?? f.email,
      phone: saved.phone ?? f.phone,
    }))
  })

  const amount = Math.floor(Number(form.amount)) || 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (amount <= 0) {
      setErrorMsg('金額を入力してください')
      return
    }

    persist({ name: form.name, email: form.email, phone: form.phone })
    setSubmitting(true)
    try {
      const res = await fetch('/api/production-request/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount }),
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

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5">
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
          お支払い金額（税込） <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-gray-900">¥</span>
          <input
            id="amount"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="flex-1 px-4 py-3 text-2xl font-bold border-2 border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            placeholder="5000"
          />
        </div>
        <p className="text-sm text-gray-600 mt-3">
          金額は自由に入力できます。<strong className="text-purple-700">目安は ¥{SUGGESTED_MIN_AMOUNT.toLocaleString()} 以上</strong>です。
          お見積もりをお伝えしている場合は、その金額をご入力ください。
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_AMOUNTS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, amount: String(value) })}
              className="px-4 py-2 text-sm font-medium rounded-full border-2 border-purple-200 text-purple-700 bg-white hover:border-purple-500 transition-colors"
            >
              ¥{value.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">依頼内容・メモ</label>
        <textarea
          rows={4}
          value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
          placeholder="制作物の内容、打ち合わせ日、お見積もり番号など"
        />
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
          {submitting
            ? 'お支払い画面を準備中...'
            : amount > 0
              ? `¥${amount.toLocaleString()} を決済する`
              : '決済に進む'}
        </button>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Stripe の安全な決済画面に移動します。カード情報が当社に保存されることはありません。
      </p>
    </form>
  )
}
