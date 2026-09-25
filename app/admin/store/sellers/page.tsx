'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/store/admin-fetch'

// lib/store/eligibility.ts の EnrollmentCheck と同じ形（申請時点の写し）
type EnrollmentCheck =
  | {
      source: 'stripe'
      subscriptionId: string
      status: string
      startedAt: string
      customerEmail: string | null
      monthlyAmount: number | null
      qualifies: boolean
    }
  | {
      source: 'db'
      enrollmentId: string
      studentName: string | null
      dbStatus: string | null
      startDate: string | null
      subscriptionId: string | null
    }

type Seller = {
  id: string
  display_name: string
  slug: string
  bio: string | null
  status: 'applied' | 'approved' | 'rejected' | 'suspended'
  review_note: string | null
  applied_at: string
  reviewed_at: string | null
  login_email: string | null
  enrollment_snapshot: EnrollmentCheck[] | null
  customer: { name: string | null; email: string | null } | null
}

const STATUS_LABEL: Record<Seller['status'], string> = {
  applied: '申請中',
  approved: '承認済み',
  rejected: '却下',
  suspended: '停止中',
}

const date = (s: string) => new Date(s).toLocaleDateString('ja-JP')

/**
 * 在籍の確認結果（申請時点）。
 * Stripe の行は、ログインのメール（MiraiID で確認済み）で Stripe を探して見つかったスクールの定期課金。
 * 「資格あり」は継続中かつ3ヶ月以上のものだけ。
 * ⚠ DB の行は公開キーで書き換えられるので参考。DB にしか無い在籍は、承認前に本人確認が要る。
 */
function Verification({ seller }: { seller: Seller }) {
  const checks = seller.enrollment_snapshot ?? []
  const stripeChecks = checks.filter((c) => c.source === 'stripe')
  const dbChecks = checks.filter((c) => c.source === 'db')
  const qualified = stripeChecks.some((c) => c.source === 'stripe' && c.qualifies)
  return (
    <div className="space-y-1 text-sm">
      <p className={qualified ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
        {qualified
          ? '✓ Stripe で確認済み（ログインのメールの月謝が継続中・3ヶ月以上）'
          : '⚠ Stripe で確認できません。承認前に本人確認をしてください'}
      </p>
      {stripeChecks.map((c) =>
        c.source === 'stripe' ? (
          <p key={c.subscriptionId} className="text-gray-700">
            Stripe: {c.status}／{date(c.startedAt)} 開始／月謝 {c.monthlyAmount != null ? `¥${c.monthlyAmount.toLocaleString('ja-JP')}` : '不明'}／
            {c.qualifies ? '資格あり' : '資格なし'}
          </p>
        ) : null
      )}
      {dbChecks.map((c) =>
        c.source === 'db' ? (
          <p key={c.enrollmentId} className="text-gray-500">
            DB（参考）: {c.dbStatus}／{c.startDate ? date(c.startDate) : '開始日なし'} 開始
            {c.studentName && `／受講者 ${c.studentName}`}
          </p>
        ) : null
      )}
      {checks.length === 0 && <p className="text-gray-500">在籍の記録なし</p>}
    </div>
  )
}

export default function AdminStoreSellersPage() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [filter, setFilter] = useState<'applied' | 'all'>('applied')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { ok, body } = await adminFetch<{ sellers: Seller[] }>('/api/admin/store/sellers')
    if (ok) {
      setSellers(body.sellers ?? [])
      setError(null)
    } else setError(body.error || '取得に失敗しました')
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function decide(s: Seller, status: 'approved' | 'rejected' | 'suspended') {
    const { ok, body } = await adminFetch(`/api/admin/store/sellers/${s.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        review_note: notes[s.id] ?? '',
        seen_status: s.status,
        seen_applied_at: s.applied_at,
      }),
    })
    if (!ok) {
      setError(body.error || '更新に失敗しました')
      return
    }
    setError(null)
    await load()
  }

  const shown = filter === 'applied' ? sellers.filter((s) => s.status === 'applied') : sellers

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">ストア: 出品者の審査</h1>
      <p className="mt-2 text-gray-600">
        「Stripe で確認済み」でない申請は、承認の前に本人確認をしてください（スクールの名簿と照らす等）。
      </p>
      <div className="mt-4 flex gap-2">
        {(['applied', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {f === 'applied' ? '申請中' : 'すべて'}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-6 text-gray-600">読み込み中…</p>
      ) : shown.length === 0 ? (
        <p className="mt-6 text-gray-600">該当する出品者はいません。</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((s) => (
            <li key={s.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="px-2 py-0.5 rounded bg-gray-100 text-sm">{STATUS_LABEL[s.status]}</span>
                <span className="font-bold text-lg">{s.display_name}</span>
                <span className="text-gray-500 text-sm">/s/{s.slug}</span>
                <span className="text-gray-500 text-sm">申請 {date(s.applied_at)}</span>
              </div>
              <p className="mt-2 text-sm text-gray-700">ログインのメール（MiraiID）: {s.login_email}</p>
              <div className="mt-2">
                <Verification seller={s} />
              </div>
              {s.bio && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{s.bio}</p>}
              {s.review_note && <p className="mt-2 text-sm text-gray-500">前回のメモ: {s.review_note}</p>}
              <textarea
                className="mt-3 w-full rounded border border-gray-300 p-2 text-sm"
                rows={2}
                placeholder="出品者に送るコメント（却下の理由など）"
                value={notes[s.id] ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setNotes((prev) => ({ ...prev, [s.id]: value }))
                }}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {(s.status === 'applied' || s.status === 'suspended') && (
                  <button onClick={() => decide(s, 'approved')} className="px-4 py-2 rounded bg-green-600 text-white text-sm">
                    {s.status === 'suspended' ? '停止を解除する' : '承認する'}
                  </button>
                )}
                {s.status === 'applied' && (
                  <button onClick={() => decide(s, 'rejected')} className="px-4 py-2 rounded bg-gray-600 text-white text-sm">
                    却下する
                  </button>
                )}
                {s.status === 'approved' && (
                  <button onClick={() => decide(s, 'suspended')} className="px-4 py-2 rounded bg-red-600 text-white text-sm">
                    停止する（作品も取り下げ）
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
