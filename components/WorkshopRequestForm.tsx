'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { gaEvent } from '@/lib/gtag'
import RememberCustomerInfo from '@/components/RememberCustomerInfo'
import { useCustomerProfile } from '@/lib/use-customer-profile'

interface Props {
  workshopId?: string
  categorySlug?: string
}

export default function WorkshopRequestForm({ workshopId, categorySlug }: Props) {
  if (!workshopId && !categorySlug) {
    throw new Error('WorkshopRequestForm requires workshopId or categorySlug')
  }
  const endpoint = workshopId
    ? `/api/workshops/${workshopId}/request`
    : `/api/categories/${categorySlug}/request`
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    name: '',
    phone: '',
    participants: 1,
    preferred_dates: '',
    message: '',
    website: '', // honeypot
  })

  // GA4: リクエストのみ導線（＝Stripe 決済導線なし）の閲覧。構造的ゼロの可視化
  useEffect(() => {
    gaEvent('ws_request_only_view', {
      workshop_id: workshopId ?? null,
      category_slug: categorySlug ?? null,
    })
  }, [workshopId, categorySlug])

  const { remember, setRemember, hasSaved, persist, forget, fromAccount } = useCustomerProfile((saved) => {
    setForm((f) => ({
      ...f,
      name: saved.name ?? f.name,
      email: saved.email ?? f.email,
      phone: saved.phone ?? f.phone,
    }))
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    persist({ name: form.name, email: form.email, phone: form.phone })
    setSubmitting(true)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setErrorMsg('短時間に複数回送信されました。30秒ほどお待ちください。')
        } else {
          setErrorMsg(data.error || '送信に失敗しました。')
        }
        return
      }
      gaEvent('ws_request_submit', {
        workshop_id: workshopId ?? null,
        category_slug: categorySlug ?? null,
        participants: form.participants,
      })
      setSuccess(true)
    } catch {
      setErrorMsg('通信エラーが発生しました。')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
        <h4 className="text-lg font-bold text-gray-900 mb-1">リクエスト受付完了</h4>
        <p className="text-sm text-gray-700">
          開催可能になりましたらご連絡いたします。
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* honeypot */}
      <input
        type="text"
        name="website"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">お名前</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">人数</label>
          <input
            type="number"
            min={1}
            max={50}
            value={form.participants}
            onChange={(e) => setForm({ ...form, participants: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">希望日程</label>
        <textarea
          rows={2}
          value={form.preferred_dates}
          onChange={(e) => setForm({ ...form, preferred_dates: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm"
          placeholder="土日希望 / 5月後半など"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">ご要望</label>
        <textarea
          rows={3}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm"
          placeholder="ご質問・ご希望があればお書きください"
        />
      </div>

      <RememberCustomerInfo
        remember={remember}
        onChange={setRemember}
        hasSaved={hasSaved}
        onForget={forget}
                fromAccount={fromAccount}
      />

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-full hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {submitting ? '送信中...' : '開催をリクエスト'}
      </button>
    </form>
  )
}
