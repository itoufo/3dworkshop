'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Cookies from 'js-cookie'
import { supabase } from '@/lib/supabase'
import { toAdminTab, type AdminTab } from '@/lib/admin-tabs'
import {
  REQUESTS_CHANGED_EVENT,
  REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUSES,
  WORKSHOP_REQUEST_STATUSES,
  type RequestKind,
  type ServiceRequestStatus,
  type WorkshopRequestStatus,
} from '@/lib/request-statuses'
import { Booking, Customer, Workshop, Coupon, WorkshopCategory } from '@/types'
import { isInternalEmail } from '@/lib/internal-emails'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Users, CreditCard, Plus, TrendingUp, Clock, Mail, Phone, UserCircle, MapPin, Edit, Tag, Pin, BookOpen, FolderOpen, CalendarPlus, Inbox, Sparkles, RefreshCw, BarChart3, Lock } from 'lucide-react'
import PushNotificationPanel from '@/components/admin/PushNotificationPanel'
import SurveyPanel from '@/components/admin/SurveyPanel'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url: string
  category: string
  tags: string[]
  author_name: string
  is_published: boolean
  published_at: string
  view_count: number
  created_at: string
}

interface WorkshopRequestRow {
  id: string
  workshop_id: string | null
  category_id: string | null
  email: string
  name: string | null
  phone: string | null
  participants: number | null
  preferred_dates: string | null
  message: string | null
  status: WorkshopRequestStatus
  created_at: string
  workshop?: { title: string } | null
  category?: { name: string; slug: string } | null
}

interface ServiceRequestRow {
  id: string
  service_id: string | null
  email: string
  name: string | null
  phone: string | null
  quantity: number | null
  message: string | null
  status: ServiceRequestStatus
  created_at: string
  service?: { title: string; type: string } | null
}

/** 区画ごとの見出し。⚠ 左メニューの項目名と揃える（違う名前だと今どこにいるか分からなくなる） */
const TAB_TITLES: Record<AdminTab, { title: string; description: string }> = {
  bookings: { title: '3DLab 管理ダッシュボード', description: '3Dプリンタ教室の予約と顧客情報を管理' },
  customers: { title: '顧客管理', description: '申し込みのあったお客様の一覧' },
  workshops: { title: 'ワークショップ', description: '開催するワークショップの作成と編集' },
  categories: { title: 'カテゴリ', description: 'ワークショップのカテゴリ（まとめページ）' },
  coupons: { title: 'クーポン', description: '割引クーポンの発行と利用状況' },
  blog: { title: 'ブログ', description: '記事の作成と公開' },
  requests: { title: 'リクエスト', description: '開催希望・法人向けサービスのお問い合わせ' },
  notifications: { title: '通知', description: 'アプリに入れている方へのお知らせ配信' },
  surveys: { title: 'アンケート', description: '2択アンケートの設問と回答' },
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [categories, setCategories] = useState<(WorkshopCategory & { workshop_count: number })[]>([])
  const [workshopRequests, setWorkshopRequests] = useState<WorkshopRequestRow[]>([])
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState(false)
  /** 問い合わせが読めなかったときの表示。⚠ 空一覧と区別するために要る */
  const [requestsError, setRequestsError] = useState<string | null>(null)
  /** 対応状況を更新中の行。二重送信と、応答の追い越しを防ぐ */
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)
  const [hideInternal, setHideInternal] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  // ⚠ どの区画を見ているかは URL だけで決まる。state に写して useEffect で追わない。
  //   写すと、左メニューを踏んでから effect が走るまでの1回、前の区画（=予約一覧の全行）
  //   を描いてから捨てることになる。導出なら最初から正しい区画で描く。
  //   区画名の一覧は lib/admin-tabs.ts（左メニューもそこから取る）
  const activeTab = toAdminTab(searchParams.get('tab'))
  const bookingWorkshopFilter = searchParams.get('workshop_id')

  /** 統計と売上グラフを出すか。/admin（タブ指定なし）＝ダッシュボードのときだけ。
   *  ⚠ 各区画の上に毎回これを出すと、左メニューで選んだ中身に届くまで800pxスクロールさせられる */
  const showOverview = !searchParams.get('tab')

  useEffect(() => {
    fetchData()
  }, [])

  /**
   * 問い合わせの取得。
   * ⚠ 失敗を黙って空一覧にしない。「0件」と「読めなかった」は画面上で区別できないので、
   *   このPRが直した「届いているのに出ていない」状態に逆戻りする
   */
  async function loadRequests() {
    try {
      const res = await fetch('/api/admin/requests')
      if (res.status === 401) {
        // ⚠ 画面側の admin_auth は残っているのに署名付きの admin_session だけ切れている状態。
        //   文字で出してもログイン画面に戻れないので、画面側の cookie を捨てて戻す
        Cookies.remove('admin_auth')
        location.reload()
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setRequestsError(data.message || '問い合わせの取得に失敗しました')
        return
      }
      setRequestsError(null)
      setWorkshopRequests((data.workshopRequests as WorkshopRequestRow[]) || [])
      setServiceRequests((data.serviceRequests as ServiceRequestRow[]) || [])
    } catch {
      setRequestsError('問い合わせの取得に失敗しました（通信エラー）')
    }
  }

  async function fetchData() {
    try {
      // 予約情報を取得（クーポン情報も含む）
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          workshop:workshops(*),
          workshop_session:workshop_sessions(*),
          customer:customers(*),
          coupon:coupons(*)
        `)
        .order('created_at', { ascending: false })

      // 顧客情報を取得
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      // ワークショップ情報を取得
      const { data: workshopsData, error: workshopsError } = await supabase
        .from('workshops')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('pin_order', { ascending: true })
        .order('created_at', { ascending: false })
      
      if (workshopsError) {
        console.error('Error fetching workshops:', workshopsError)
      }
      console.log('Fetched workshops:', workshopsData)

      // クーポン情報を取得
      const { data: couponsData, error: couponsError } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (couponsError) {
        console.error('Error fetching coupons:', couponsError)
      }

      // ブログ投稿を取得
      const { data: blogPostsData, error: blogPostsError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (blogPostsError) {
        console.error('Error fetching blog posts:', blogPostsError)
      }

      // カテゴリ情報を取得
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('workshop_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      }

      // カテゴリごとのWS数を計算
      const categoriesWithCount = (categoriesData || []).map(cat => ({
        ...cat,
        workshop_count: (workshopsData || []).filter(w => w.category_id === cat.id).length
      }))

      // リクエスト一覧 (ワークショップ開催・サービス購入相談)
      // ⚠ anon キーでは読めない（RLS が INSERT だけ許可）。管理用の API 経由で取る。
      //   ここを supabase 直読みに戻すと、届いた問い合わせが1件も出ない状態に逆戻りする
      // ⚠ fetch は通信に失敗すると例外を投げる（supabase-js は投げずに error を返す）。
      //   ここで投げさせると、取得済みの予約・顧客・ワークショップまで画面に出せなくなる。
      //   この1件だけ別に捕まえる
      await loadRequests()

      setBookings(bookingsData || [])
      setCustomers(customersData || [])
      setWorkshops(workshopsData || [])
      setCoupons(couponsData || [])
      setBlogPosts(blogPostsData || [])
      setCategories(categoriesWithCount)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 対応状況の更新。
   * ⚠ anon キーでは書けない（RLS が INSERT だけ許可）。しかも RLS は0件更新でも
   *   エラーを返さないので、直書きしていた頃は「押すと画面だけ変わって DB は元のまま」
   *   だった。API 側で更新できた行数を確かめている。
   * ⚠ 同じ行への2回目は受け付けない。続けて変えると応答の到着順が入れ替わり、
   *   画面が DB と違う値で落ち着くことがある
   */
  async function updateRequestStatus(
    kind: 'workshop',
    id: string,
    status: WorkshopRequestStatus,
  ): Promise<void>
  async function updateRequestStatus(
    kind: 'service',
    id: string,
    status: ServiceRequestStatus,
  ): Promise<void>
  async function updateRequestStatus(kind: RequestKind, id: string, status: string): Promise<void> {
    if (updatingRequestId) return
    setUpdatingRequestId(id)
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, status }),
      })
      if (res.status === 401) {
        Cookies.remove('admin_auth')
        location.reload()
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('リクエストの更新に失敗:', data)
        alert(data.message || 'ステータス更新に失敗しました')
        return
      }
      if (kind === 'workshop') {
        setWorkshopRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: status as WorkshopRequestStatus } : r)),
        )
      } else {
        setServiceRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: status as ServiceRequestStatus } : r)),
        )
      }
      // 左メニューの未対応件数に知らせる（別のコンポーネントなので合図で伝える）
      window.dispatchEvent(new Event(REQUESTS_CHANGED_EVENT))
    } catch {
      alert('ステータス更新に失敗しました（通信エラー）')
    } finally {
      setUpdatingRequestId(null)
    }
  }

  async function updateBookingStatus(bookingId: string, status: string) {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId)

      if (error) throw error

      // データを再取得
      fetchData()
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('ステータスの更新に失敗しました')
    }
  }

  async function togglePinWorkshop(workshopId: string, currentPinStatus: boolean) {
    try {
      const { error } = await supabase
        .from('workshops')
        .update({ 
          is_pinned: !currentPinStatus,
          pin_order: !currentPinStatus ? Date.now() : 0
        })
        .eq('id', workshopId)

      if (error) throw error

      // データを再取得
      fetchData()
    } catch (error) {
      console.error('Error updating workshop pin status:', error)
      alert('ピン留めの更新に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  const handleNavigate = (path: string) => {
    setNavigating(true)
    router.push(path)
  }

  // 内部/テスト（オーナー・身内・動作確認）は集計から除外し、実顧客だけを見る
  const realBookings = bookings.filter((b) => !isInternalEmail(b.customer?.email))
  const realCustomers = customers.filter((c) => !isInternalEmail(c.email))
  const internalBookingCount = bookings.length - realBookings.length

  // 売上集計（キャンセル + 内部/テストは除外）
  const validBookings = realBookings.filter((b) => b.status !== 'cancelled')

  const totalSales = validBookings.reduce((sum, b) => sum + b.total_amount, 0)

  // 予約管理タブの表示対象（キャンセルはデフォルト非表示・ワークショップ絞り込み対応）
  const filterWorkshop = bookingWorkshopFilter
    ? workshops.find((w) => w.id === bookingWorkshopFilter) || null
    : null
  const displayedBookings = bookings.filter(
    (b) =>
      (showCancelled || b.status !== 'cancelled') &&
      (!hideInternal || !isInternalEmail(b.customer?.email)) &&
      (!bookingWorkshopFilter || b.workshop_id === bookingWorkshopFilter)
  )
  const cancelledCount = bookings.filter(
    (b) => b.status === 'cancelled' && (!bookingWorkshopFilter || b.workshop_id === bookingWorkshopFilter)
  ).length

  // ワークショップ（日程）ごとの予約人数（キャンセル除く）
  const participantsByWorkshop = new Map<string, number>()
  for (const b of validBookings) {
    participantsByWorkshop.set(b.workshop_id, (participantsByWorkshop.get(b.workshop_id) || 0) + b.participants)
  }

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // 月別売上（予約作成日ベース、直近12ヶ月）
  const monthlySalesMap = new Map<string, number>()
  for (const b of validBookings) {
    const d = new Date(b.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlySalesMap.set(key, (monthlySalesMap.get(key) || 0) + b.total_amount)
  }

  const monthlySales: { key: string; label: string; amount: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlySales.push({
      key,
      label: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      amount: monthlySalesMap.get(key) || 0,
    })
  }

  const currentMonthSales = monthlySalesMap.get(currentMonthKey) || 0
  const maxMonthlySales = Math.max(...monthlySales.map((m) => m.amount), 1)

  return (
    <>
      {navigating && <LoadingOverlay message="ページを読み込んでいます..." />}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{TAB_TITLES[activeTab].title}</h2>
            <p className="text-gray-600 mt-1">{TAB_TITLES[activeTab].description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <RevalidateButton />
            <div className="text-sm text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </div>
          </div>
        </div>

        {showOverview && (
        <>
        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <h3 className="text-sm font-medium text-white/80">総予約数</h3>
            <p className="text-3xl font-bold">{realBookings.length}</p>
            <p className="text-xs text-white/60 mt-2">
              実顧客のみ{internalBookingCount > 0 ? `（内部/テスト${internalBookingCount}件を除く）` : ''}
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <h3 className="text-sm font-medium text-white/80">顧客数</h3>
            <p className="text-3xl font-bold">{realCustomers.length}</p>
            <p className="text-xs text-white/60 mt-2">実顧客のみ</p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <h3 className="text-sm font-medium text-white/80">ワークショップ</h3>
            <p className="text-3xl font-bold">{workshops.length}</p>
            <p className="text-xs text-white/60 mt-2">開催予定</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">今月</span>
            </div>
            <h3 className="text-sm font-medium text-white/80">今月の売上</h3>
            <p className="text-3xl font-bold">
              ¥{currentMonthSales.toLocaleString()}
            </p>
            <p className="text-xs text-white/60 mt-2">全期間: ¥{totalSales.toLocaleString()}（キャンセル除く）</p>
          </div>
        </div>

        {/* 売上の月別推移 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
                売上の月別推移
              </h3>
              <p className="text-sm text-gray-600 mt-1">直近12ヶ月・予約作成日ベース（キャンセル除く）</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">今月</p>
              <p className="text-2xl font-bold text-purple-600">¥{currentMonthSales.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-56">
            {monthlySales.map((m) => {
              const heightPct = (m.amount / maxMonthlySales) * 100
              const isCurrent = m.key === currentMonthKey
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group">
                  <div className="text-xs font-medium text-gray-700 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ¥{m.amount.toLocaleString()}
                  </div>
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-t from-purple-600 to-pink-500'
                        : 'bg-gradient-to-t from-purple-300 to-purple-400 group-hover:from-purple-400 group-hover:to-purple-500'
                    }`}
                    style={{ height: `${Math.max(heightPct, m.amount > 0 ? 2 : 0)}%` }}
                    title={`${m.label}: ¥${m.amount.toLocaleString()}`}
                  />
                  <div className={`text-xs mt-2 ${isCurrent ? 'text-purple-600 font-semibold' : 'text-gray-500'}`}>
                    {m.label.slice(2)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </>
        )}
      </div>

      {/* 予約管理 */}
      {activeTab === 'bookings' && (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">予約一覧</h3>
              <p className="text-sm text-gray-600 mt-1">
                {displayedBookings.length}件を表示（全{bookings.length}件）
                {!showCancelled && cancelledCount > 0 && ` ・ キャンセル${cancelledCount}件は非表示`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {filterWorkshop && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  <Calendar className="w-4 h-4" />
                  {filterWorkshop.title}
                  {filterWorkshop.event_date && (
                    <span className="text-xs text-blue-600">
                      {new Date(filterWorkshop.event_date).toLocaleDateString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>
                  )}
                  <button
                    onClick={() => router.replace('/admin?tab=bookings')}
                    className="ml-1 text-blue-500 hover:text-blue-800 font-bold"
                    title="絞り込みを解除"
                  >
                    ×
                  </button>
                </span>
              )}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                キャンセルも表示
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideInternal}
                  onChange={(e) => setHideInternal(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                内部/テストを隠す
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日時
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ワークショップ開催日
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ワークショップ
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客情報
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    人数
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額・クーポン
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    クーポン
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {displayedBookings.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      表示できる予約がありません
                    </td>
                  </tr>
                )}
                {displayedBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status === 'confirmed' ? '✓ 確定' : booking.status === 'cancelled' ? '× キャンセル' : '○ 保留'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </div>
                      <div className="text-xs text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {new Date(booking.created_at).toLocaleTimeString('ja-JP', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        // 予約は「開催回(workshop_sessions)」に紐づく。workshops 側の
                        // event_date/event_time は複数開催のときの代表値でしかなく、
                        // 全予約が同じ時刻に見えてしまうため、回ごとの日時を優先する。
                        const eventDate =
                          booking.workshop_session?.event_date
                          || booking.booking_date
                          || booking.workshop?.event_date
                        const eventTime =
                          booking.workshop_session?.event_time
                          || booking.booking_time
                          || booking.workshop?.event_time

                        if (!eventDate) {
                          return <span className="text-sm text-gray-400">未設定</span>
                        }

                        return (
                          <div>
                            <div className="text-sm text-gray-900 font-medium">
                              {new Date(`${eventDate}T00:00:00`).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </div>
                            {eventTime && (
                              <div className="text-xs text-gray-500">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {eventTime.slice(0, 5)}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-4 max-w-[200px]">
                      <div
                        className="text-sm font-medium text-gray-900 truncate"
                        title={booking.workshop?.title}
                      >
                        {booking.workshop?.title}
                      </div>
                      {booking.workshop?.location && (
                        <div className="text-xs text-gray-500 truncate" title={booking.workshop.location}>
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {booking.workshop.location}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <UserCircle className="w-3 h-3 inline mr-1" />
                        {booking.customer?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        <Mail className="w-3 h-3 inline mr-1" />
                        {booking.customer?.email}
                      </div>
                      {isInternalEmail(booking.customer?.email) && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
                          内部/テスト
                        </span>
                      )}
                      {booking.customer?.phone && (
                        <div className="text-xs text-gray-500">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {booking.customer.phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {booking.participants}名
                      </span>
                      {booking.minor_count != null && booking.minor_count > 0 && (
                        <div className="text-xs text-orange-600 mt-1">
                          うち高校生以下{booking.minor_count}名
                          {booking.minor_grades && <>（{booking.minor_grades}）</>}
                        </div>
                      )}
                      {booking.companion_count != null && booking.companion_count > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          + 同伴者{booking.companion_count}名（無料・席数外）
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        ¥{booking.total_amount.toLocaleString()}
                      </div>
                      {booking.discount_amount && booking.discount_amount > 0 && (
                        <div className="text-xs text-gray-500">
                          (割引前: ¥{(booking.total_amount + booking.discount_amount).toLocaleString()})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.coupon_id && booking.coupon ? (
                        <div>
                          <div className="text-sm font-medium text-purple-600">
                            <Tag className="w-3 h-3 inline mr-1" />
                            {booking.coupon.code}
                          </div>
                          <div className="text-xs text-gray-500">
                            -¥{(booking.discount_amount || 0).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">なし</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <select
                        value={booking.status}
                        onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                        className="text-purple-600 hover:text-purple-900 border border-purple-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="pending">保留</option>
                        <option value="confirmed">確定</option>
                        <option value="cancelled">キャンセル</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 顧客管理 */}
      {activeTab === 'customers' && (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">顧客一覧</h3>
            <p className="text-sm text-gray-600 mt-1">全{customers.length}名の顧客</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客情報
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    連絡先
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    属性
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録日
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {customer.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {customer.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <Mail className="w-3 h-3 inline mr-1 text-gray-400" />
                        {customer.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Phone className="w-3 h-3 inline mr-1 text-gray-400" />
                        {customer.phone || '未登録'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {customer.age && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {customer.age}歳
                          </span>
                        )}
                        {customer.gender && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                            {customer.gender === 'male' ? '男性' : 
                             customer.gender === 'female' ? '女性' :
                             customer.gender === 'other' ? 'その他' : '回答しない'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ワークショップ管理 */}
      {activeTab === 'workshops' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ワークショップ一覧</h3>
              <p className="text-sm text-gray-600 mt-1">全{workshops.length}件のワークショップ</p>
            </div>
            <button
              onClick={() => handleNavigate('/admin/workshops/new')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              新規ワークショップ追加
            </button>
          </div>
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ワークショップ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      開催情報
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      料金・人数
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {workshops.map((workshop) => (
                    <tr key={workshop.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {workshop.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={workshop.image_url}
                              alt={workshop.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-bold text-purple-600">3D</span>
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              {workshop.title}
                              {workshop.is_pinned && (
                                <Pin className="w-4 h-4 ml-2 text-orange-500 fill-orange-500" />
                              )}
                              {workshop.is_private && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                  <Lock className="w-3 h-3 mr-1" />
                                  限定公開
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {workshop.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {workshop.event_date ? (
                          <div>
                            <div className="text-sm text-gray-900">
                              <Calendar className="w-3 h-3 inline mr-1 text-gray-400" />
                              {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                                year: '2-digit',
                                month: '2-digit',
                                day: '2-digit'
                              })}
                            </div>
                            {workshop.event_time && (
                              <div className="text-sm text-gray-500">
                                <Clock className="w-3 h-3 inline mr-1 text-gray-400" />
                                {workshop.event_time.slice(0, 5)}
                              </div>
                            )}
                            {workshop.location && (
                              <div className="text-xs text-gray-500 mt-1">
                                <MapPin className="w-3 h-3 inline mr-1 text-gray-400" />
                                {workshop.location}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">未設定</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ¥{workshop.price.toLocaleString()}
                        </div>
                        <div className="text-sm mt-1">
                          <Users className="w-3 h-3 inline mr-1 text-gray-400" />
                          {(() => {
                            const booked =
                              (participantsByWorkshop.get(workshop.id) || 0) +
                              (workshop.manual_participants || 0)
                            const isFull = booked >= workshop.max_participants
                            return (
                              <span className={`font-semibold ${isFull ? 'text-red-600' : 'text-purple-700'}`}>
                                予約{booked}名
                              </span>
                            )
                          })()}
                          <span className="text-xs text-gray-500"> / 最大{workshop.max_participants}名</span>
                        </div>
                        <div className="text-xs text-gray-500">{workshop.duration}分</div>
                        {workshop.manual_participants && workshop.manual_participants > 0 && (
                          <div className="text-xs text-orange-600 mt-1">
                            手動調整: +{workshop.manual_participants}名
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => togglePinWorkshop(workshop.id, workshop.is_pinned || false)}
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-colors ${
                              workshop.is_pinned
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={workshop.is_pinned ? 'ピン留めを解除' : 'ピン留めする'}
                          >
                            <Pin className={`w-4 h-4 ${workshop.is_pinned ? 'fill-orange-700' : ''}`} />
                          </button>
                          <button
                            onClick={() => router.push(`/admin?tab=bookings&workshop_id=${workshop.id}`)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="この日程の予約だけを予約管理で表示"
                          >
                            <Users className="w-4 h-4 mr-1" />
                            参加者一覧
                          </button>
                          <button
                            onClick={() => handleNavigate(`/admin/workshops/${workshop.id}/edit`)}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            編集
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* カテゴリ管理 */}
      {activeTab === 'categories' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">カテゴリ一覧</h3>
              <p className="text-sm text-gray-600 mt-1">全{categories.length}件のカテゴリ</p>
            </div>
            <button
              onClick={() => handleNavigate('/admin/categories/new')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              新規カテゴリ作成
            </button>
          </div>
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      スラッグ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ワークショップ数
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      並び順
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {category.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={category.image_url}
                              alt={category.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                              <FolderOpen className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                            {category.description && (
                              <div className="text-xs text-gray-500 line-clamp-1">{category.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 font-mono">{category.slug}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {category.workshop_count}件
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {category.sort_order}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleNavigate(`/admin/workshops/new?from_category=${category.id}`)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="このカテゴリの日程を追加"
                          >
                            <CalendarPlus className="w-4 h-4 mr-1" />
                            日程追加
                          </button>
                          <button
                            onClick={() => handleNavigate(`/admin/categories/${category.id}/edit`)}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            編集
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        カテゴリがまだありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* クーポン管理 */}
      {activeTab === 'coupons' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">クーポン一覧</h3>
              <p className="text-sm text-gray-600 mt-1">全{coupons.length}件のクーポン</p>
            </div>
            <button
              onClick={() => handleNavigate('/admin/coupons/new')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              新規クーポン作成
            </button>
          </div>
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      クーポン情報
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      割引内容
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      使用状況
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      有効期限
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            <Tag className="w-4 h-4 inline mr-1 text-purple-500" />
                            {coupon.code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {coupon.description || '説明なし'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {coupon.discount_type === 'percentage' 
                            ? `${coupon.discount_value}%割引` 
                            : `¥${coupon.discount_value.toLocaleString()}割引`}
                        </div>
                        {coupon.minimum_amount && (
                          <div className="text-xs text-gray-500">
                            最低利用金額: ¥{coupon.minimum_amount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {coupon.usage_count} / {coupon.usage_limit || '無制限'}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ 
                              width: coupon.usage_limit 
                                ? `${(coupon.usage_count / coupon.usage_limit) * 100}%` 
                                : '0%' 
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <Calendar className="w-3 h-3 inline mr-1 text-gray-400" />
                          {new Date(coupon.valid_from).toLocaleDateString('ja-JP')}
                        </div>
                        {coupon.valid_until && (
                          <div className="text-xs text-gray-500">
                            〜 {new Date(coupon.valid_until).toLocaleDateString('ja-JP')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {coupon.is_active ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ 有効
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            × 無効
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleNavigate(`/admin/coupons/${coupon.id}/edit`)}
                          className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ブログ管理 */}
      {activeTab === 'blog' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ブログ一覧</h3>
              <p className="text-sm text-gray-600 mt-1">全{blogPosts.length}件の記事</p>
            </div>
            <button
              onClick={() => handleNavigate('/admin/blog/new')}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-5 h-5 mr-2" />
              新規記事作成
            </button>
          </div>
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      記事情報
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリー・タグ
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公開状況
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      閲覧数
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {blogPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {post.featured_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={post.featured_image_url}
                              alt={post.title}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-purple-600" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {post.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {post.author_name || '作者不明'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {post.category && (
                          <div className="mb-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {post.category}
                            </span>
                          </div>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 2).map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                            {post.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{post.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {post.is_published ? (
                          <div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ 公開中
                            </span>
                            {post.published_at && (
                              <div className="text-xs text-gray-500 mt-1">
                                {new Date(post.published_at).toLocaleDateString('ja-JP')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            下書き
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {post.view_count.toLocaleString()} views
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleNavigate(`/admin/blog/${post.id}/edit`)}
                          className="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          編集
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* リクエスト管理 */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* ⚠ 読めなかったことを必ず出す。黙って空一覧にすると
              「届いているのに出ていない」に逆戻りして、また誰も気づかない */}
          {requestsError && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
              <p className="text-base font-bold text-red-800">{requestsError}</p>
              <p className="mt-1 text-sm text-red-700">
                下の一覧は空に見えていますが、届いていないという意味ではありません。
                画面を再読み込みしても直らない場合はご連絡ください。
              </p>
            </div>
          )}
          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Inbox className="w-5 h-5 mr-2 text-amber-600" />
                ワークショップ開催リクエスト
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                全{workshopRequests.length}件 / 未対応 {workshopRequests.filter(r => r.status === 'new').length}件
              </p>
            </div>
            <div className="overflow-x-auto">
              {workshopRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-12">リクエストはまだありません</p>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">受信日時</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">対象</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">送信者</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">希望日程</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メッセージ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workshopRequests.map((req) => (
                      <tr key={req.id} className={req.status === 'new' ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(req.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {req.category ? (
                            <div>
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded mr-1">カテゴリ</span>
                              <span className="font-medium text-gray-900">{req.category.name}</span>
                            </div>
                          ) : req.workshop ? (
                            <div>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded mr-1">単体</span>
                              <span className="font-medium text-gray-900 max-w-[180px] truncate inline-block align-middle" title={req.workshop.title}>{req.workshop.title}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">(削除済)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-900">{req.name || '未入力'}</div>
                          <a href={`mailto:${req.email}`} className="text-xs text-blue-600 hover:underline">{req.email}</a>
                          {req.phone && <div className="text-xs text-gray-500">{req.phone}</div>}
                          {req.participants != null && <div className="text-xs text-gray-500">{req.participants}名</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 max-w-[160px] whitespace-pre-line">{req.preferred_dates || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 max-w-[240px] whitespace-pre-line">{req.message || '-'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={req.status}
                            onChange={(e) =>
                              updateRequestStatus('workshop', req.id, e.target.value as WorkshopRequestStatus)
                            }
                            disabled={updatingRequestId === req.id}
                            className="text-xs px-2 py-1 border border-gray-300 rounded disabled:opacity-50"
                          >
                            {WORKSHOP_REQUEST_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {REQUEST_STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                オーダーメイド / 追加印刷 相談
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                全{serviceRequests.length}件 / 未対応 {serviceRequests.filter(r => r.status === 'new').length}件
              </p>
            </div>
            <div className="overflow-x-auto">
              {serviceRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-12">リクエストはまだありません</p>
              ) : (
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">受信日時</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">サービス</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">送信者</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">数量</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メッセージ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceRequests.map((req) => (
                      <tr key={req.id} className={req.status === 'new' ? 'bg-amber-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {new Date(req.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {req.service ? (
                            <div>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded mr-2">{req.service.type === 'reprint' ? '追加印刷' : 'オーダー'}</span>
                              <span className="font-medium text-gray-900">{req.service.title}</span>
                            </div>
                          ) : <span className="text-gray-400">(削除済)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="text-gray-900">{req.name || '未入力'}</div>
                          <a href={`mailto:${req.email}`} className="text-xs text-blue-600 hover:underline">{req.email}</a>
                          {req.phone && <div className="text-xs text-gray-500">{req.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">{req.quantity != null ? `${req.quantity}個` : '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 max-w-[280px] whitespace-pre-line">{req.message || '-'}</td>
                        <td className="px-4 py-3">
                          <select
                            value={req.status}
                            onChange={(e) =>
                              updateRequestStatus('service', req.id, e.target.value as ServiceRequestStatus)
                            }
                            disabled={updatingRequestId === req.id}
                            className="text-xs px-2 py-1 border border-gray-300 rounded disabled:opacity-50"
                          >
                            {SERVICE_REQUEST_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {REQUEST_STATUS_LABELS[st]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && <PushNotificationPanel />}

      {activeTab === 'surveys' && <SurveyPanel />}
      </div>
    </>
  )
}

function RevalidateButton() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleClick() {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMsg(`失敗: ${data.error || res.status}`)
      } else {
        setMsg('✓ キャッシュ更新完了')
        setTimeout(() => setMsg(null), 3000)
      }
    } catch {
      setMsg('失敗: 通信エラー')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
        title="公開ページの ISR キャッシュを今すぐ更新"
      >
        <RefreshCw className={`w-4 h-4 mr-1.5 ${busy ? 'animate-spin' : ''}`} />
        {busy ? '更新中...' : 'キャッシュ更新'}
      </button>
      {msg && <span className="text-xs text-gray-600">{msg}</span>}
    </div>
  )
}