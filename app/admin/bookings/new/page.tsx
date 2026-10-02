'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { adminJson } from '@/lib/admin-api-client'
import LoadingOverlay from '@/components/LoadingOverlay'
import {
  BOOKING_SOURCES,
  BOOKING_SOURCE_DETAIL_HINTS,
  BOOKING_SOURCE_LABELS,
  type BookingSource,
} from '@/lib/booking-sources'
import type { Customer, Workshop, WorkshopSession } from '@/types'
import { ArrowLeft, AlertCircle, Calendar, CreditCard, Route, Save, UserCircle, UserPlus } from 'lucide-react'

// 管理画面からの予約（売上）の手動登録。
// メール・電話・他の予約サイト経由の予約を bookings に入れ、売上と人数の集計に乗せる。
// 書き込みは /api/admin/bookings（service role）経由。

type CustomerOption = Pick<Customer, 'id' | 'name' | 'email'>
type WorkshopOption = Pick<Workshop, 'id' | 'title' | 'price' | 'event_date'>
type SessionOption = Pick<WorkshopSession, 'id' | 'workshop_id' | 'event_date' | 'event_time' | 'status'>

function formatSession(s: SessionOption): string {
  const date = new Date(`${s.event_date}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })
  const time = s.event_time ? ` ${s.event_time.slice(0, 5)}` : ''
  return `${date}${time}${s.status === 'cancelled' ? '（中止）' : ''}`
}

export default function NewBookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [workshops, setWorkshops] = useState<WorkshopOption[]>([])
  const [sessions, setSessions] = useState<SessionOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [customerQuery, setCustomerQuery] = useState('')
  const [form, setForm] = useState({
    customer_id: searchParams.get('customer_id') || '',
    workshop_id: '',
    session_id: '',
    participants: '1',
    total_amount: '',
    commission_amount: '0',
    source: 'booking_site' as BookingSource,
    source_detail: '',
    payment_status: 'paid',
    status: 'confirmed',
    notes: '',
  })
  /** 金額を手で直したか。直していなければ 単価×人数 を入れ続ける */
  const [amountEdited, setAmountEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [navigating, setNavigating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // 顧客は管理用の API（service role）経由で読む。workshops / workshop_sessions は公開情報なので anon で読める
      const [c, w, s] = await Promise.all([
        adminJson<{ customers: CustomerOption[] }>('/api/admin/customers'),
        supabase.from('workshops').select('id, title, price, event_date').order('created_at', { ascending: false }),
        supabase
          .from('workshop_sessions')
          .select('id, workshop_id, event_date, event_time, status')
          .order('event_date', { ascending: false }),
      ])
      if (!c.ok || w.error || s.error) {
        console.error('manual booking load failed:', !c.ok ? c.message : w.error || s.error)
        setLoadError('顧客・ワークショップの読み込みに失敗しました。再読み込みしてください。')
      }
      setCustomers(c.ok ? c.data.customers || [] : [])
      setWorkshops(w.data || [])
      setSessions(s.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const selectedCustomer = customers.find((c) => c.id === form.customer_id) || null
  const selectedWorkshop = workshops.find((w) => w.id === form.workshop_id) || null
  const workshopSessions = useMemo(
    // 中止の回は選ばせない（API 側でも弾いている）
    () => sessions.filter((s) => s.workshop_id === form.workshop_id && s.status !== 'cancelled'),
    [sessions, form.workshop_id],
  )

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 50)
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 50)
  }, [customers, customerQuery])

  // 単価×人数を金額の初期値にする（他サイト経由で値段が違うときは手で直す）
  useEffect(() => {
    if (amountEdited || !selectedWorkshop) return
    const n = Number(form.participants)
    if (Number.isInteger(n) && n > 0) {
      setForm((f) => ({ ...f, total_amount: String(selectedWorkshop.price * n) }))
    }
  }, [selectedWorkshop, form.participants, amountEdited])

  const total = Number(form.total_amount) || 0
  const commission = Number(form.commission_amount) || 0
  const net = total - commission

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErrorMessage(null)
    try {
      const post = (allowOverCapacity: boolean) =>
        fetch('/api/admin/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, allow_over_capacity: allowOverCapacity }),
        })
      let response = await post(false)
      let data = await response.json().catch(() => ({}))
      // 定員超過は確認してから登録する（他サイトで受けてしまった予約の記録もあるので拒否はしない）
      if (response.status === 409 && data.code === 'over_capacity') {
        if (!window.confirm(`${data.error}\nこのまま登録しますか？`)) return
        response = await post(true)
        data = await response.json().catch(() => ({}))
      }
      if (response.status === 401) {
        setErrorMessage('管理画面のログインが古くなっています。一度ログアウトして、入り直してください。')
        return
      }
      if (!response.ok) {
        setErrorMessage(data.error || '予約の登録に失敗しました')
        return
      }
      alert('予約を登録しました')
      setNavigating(true)
      router.push('/admin?tab=bookings')
    } catch (error) {
      console.error('Error creating booking:', error)
      setErrorMessage('予約の登録に失敗しました（通信エラー）')
    } finally {
      setSaving(false)
    }
  }

  const goTo = (path: string) => {
    setNavigating(true)
    router.push(path)
  }

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-2'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <>
      {navigating && <LoadingOverlay message="ページを読み込んでいます..." />}
      {saving && <LoadingOverlay message="予約を登録しています..." />}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => goTo('/admin?tab=bookings')}
          className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          予約一覧に戻る
        </button>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
            <h2 className="text-2xl font-bold text-white">予約の手動登録</h2>
            <p className="text-white/80 mt-1">
              メール・電話・他の予約サイトで受けた予約を登録し、売上と参加人数に反映します
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {loadError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-base text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{loadError}</span>
              </div>
            )}

            {/* 顧客 */}
            <div className="bg-purple-50 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserCircle className="w-5 h-5 mr-2 text-purple-600" />
                  顧客 *
                </h3>
                <button
                  type="button"
                  onClick={() => goTo('/admin/customers/new?next=booking')}
                  className="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-800"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  新しい顧客を登録
                </button>
              </div>
              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-xl bg-white border border-purple-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, customer_id: '' })}
                    className="text-sm text-gray-500 hover:text-purple-600"
                  >
                    変更
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="search"
                    className={inputClass}
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="名前またはメールで検索"
                  />
                  <ul className="max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                    {filteredCustomers.length === 0 && (
                      <li className="px-4 py-3 text-base text-gray-500">該当する顧客がいません</li>
                    )}
                    {filteredCustomers.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, customer_id: c.id })}
                          className="w-full text-left px-4 py-3 hover:bg-purple-50"
                        >
                          <span className="font-medium text-gray-900">{c.name}</span>
                          <span className="ml-2 text-sm text-gray-500">{c.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {/* ワークショップ・日程 */}
            <div className="bg-pink-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-pink-600" />
                ワークショップと日程
              </h3>
              <div>
                <label className={labelClass}>ワークショップ *</label>
                <select
                  required
                  className={inputClass}
                  value={form.workshop_id}
                  onChange={(e) => setForm({ ...form, workshop_id: e.target.value, session_id: '' })}
                >
                  <option value="">選んでください</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title}
                    </option>
                  ))}
                </select>
              </div>
              {form.workshop_id && (
                <div>
                  <label className={labelClass}>開催日程 {workshopSessions.length > 0 && '*'}</label>
                  {workshopSessions.length > 0 ? (
                    <select
                      required
                      className={inputClass}
                      value={form.session_id}
                      onChange={(e) => setForm({ ...form, session_id: e.target.value })}
                    >
                      <option value="">選んでください</option>
                      {workshopSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatSession(s)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-base text-gray-600">
                      日程が登録されていないワークショップです。ワークショップの開催日で登録します。
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className={labelClass}>人数 *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  className={inputClass}
                  value={form.participants}
                  onChange={(e) => setForm({ ...form, participants: e.target.value })}
                />
                <p className="text-sm text-gray-500 mt-1">
                  この人数は参加人数（定員）の集計に入ります。同じ予約をワークショップ編集画面の「他媒体の予約人数」にも入れている場合は、二重に数えないようそちらを減らしてください。
                </p>
              </div>
            </div>

            {/* 流入経路 */}
            <div className="bg-indigo-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Route className="w-5 h-5 mr-2 text-indigo-600" />
                流入経路
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>経路 *</label>
                  <select
                    required
                    className={inputClass}
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as BookingSource })}
                  >
                    {BOOKING_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {BOOKING_SOURCE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>補足</label>
                  <input
                    type="text"
                    maxLength={100}
                    className={inputClass}
                    value={form.source_detail}
                    onChange={(e) => setForm({ ...form, source_detail: e.target.value })}
                    placeholder={BOOKING_SOURCE_DETAIL_HINTS[form.source] || '任意'}
                  />
                </div>
              </div>
            </div>

            {/* 金額 */}
            <div className="bg-green-50 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                金額
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>お客様の支払額（円・税込）*</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className={inputClass}
                    value={form.total_amount}
                    onChange={(e) => {
                      setAmountEdited(true)
                      setForm({ ...form, total_amount: e.target.value })
                    }}
                  />
                  {selectedWorkshop && (
                    <p className="text-sm text-gray-500 mt-1">
                      定価 ¥{selectedWorkshop.price.toLocaleString()} × 人数 で自動入力しています
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>販売手数料（円）</label>
                  <input
                    type="number"
                    min={0}
                    className={inputClass}
                    value={form.commission_amount}
                    onChange={(e) => setForm({ ...form, commission_amount: e.target.value })}
                  />
                  <p className="text-sm text-gray-500 mt-1">他の予約サイトに払う手数料。なければ 0</p>
                </div>
              </div>
              <p className="text-base text-gray-800">
                手取り：<span className={`font-bold ${net < 0 ? 'text-red-600' : 'text-green-700'}`}>¥{net.toLocaleString()}</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>支払状況</label>
                  <select
                    className={inputClass}
                    value={form.payment_status}
                    onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                  >
                    <option value="paid">支払済み</option>
                    <option value="pending">未払い</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>予約の状態</label>
                  <select
                    className={inputClass}
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="confirmed">確定</option>
                    <option value="pending">保留</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>メモ</label>
                <textarea
                  rows={2}
                  maxLength={1000}
                  className={`${inputClass} resize-none`}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="予約サイトの予約番号など"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-base text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={() => goTo('/admin?tab=bookings')}
                className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving || !form.customer_id}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
              >
                <Save className="w-5 h-5 mr-2" />
                登録する
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
