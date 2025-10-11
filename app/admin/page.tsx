'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Booking, Customer, Workshop, Coupon } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Users, CreditCard, Plus, TrendingUp, Clock, Mail, Phone, UserCircle, MapPin, Edit, Tag, Pin } from 'lucide-react'

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings' | 'customers' | 'workshops' | 'coupons'>('bookings')
  const [navigating, setNavigating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      // 予約情報を取得（クーポン情報も含む）
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          *,
          workshop:workshops(*),
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

      setBookings(bookingsData || [])
      setCustomers(customersData || [])
      setWorkshops(workshopsData || [])
      setCoupons(couponsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
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

  return (
    <>
      {navigating && <LoadingOverlay message="ページを読み込んでいます..." />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">3DLab 管理ダッシュボード</h2>
            <p className="text-gray-600 mt-1">3Dプリンタ教室の予約と顧客情報を管理</p>
          </div>
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
            <p className="text-3xl font-bold">{bookings.length}</p>
            <p className="text-xs text-white/60 mt-2">全期間の予約</p>
          </div>
          
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <TrendingUp className="w-5 h-5 text-white/60" />
            </div>
            <h3 className="text-sm font-medium text-white/80">顧客数</h3>
            <p className="text-3xl font-bold">{customers.length}</p>
            <p className="text-xs text-white/60 mt-2">登録済み顧客</p>
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
            <h3 className="text-sm font-medium text-white/80">売上</h3>
            <p className="text-3xl font-bold">
              ¥{bookings.reduce((sum, b) => sum + b.total_amount, 0).toLocaleString()}
            </p>
            <p className="text-xs text-white/60 mt-2">全期間の合計</p>
          </div>
        </div>

        {/* タブ */}
        <div className="bg-white rounded-2xl shadow-sm p-2 mb-6">
          <nav className="flex space-x-2">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'bookings'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              予約管理
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'customers'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              顧客管理
            </button>
            <button
              onClick={() => setActiveTab('workshops')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'workshops'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              ワークショップ管理
            </button>
            <button
              onClick={() => setActiveTab('coupons')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-300 ${
                activeTab === 'coupons'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Tag className="w-4 h-4 inline mr-2" />
              クーポン管理
            </button>
          </nav>
        </div>
      </div>

      {/* 予約管理 */}
      {activeTab === 'bookings' && (
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">予約一覧</h3>
            <p className="text-sm text-gray-600 mt-1">全{bookings.length}件の予約</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日時
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ワークショップ開催日
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                    予約作成日
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
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
                      {booking.workshop?.event_date ? (
                        <div>
                          <div className="text-sm text-gray-900 font-medium">
                            {new Date(booking.workshop.event_date).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                          {booking.workshop?.event_time && (
                            <div className="text-xs text-gray-500">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {booking.workshop.event_time.slice(0, 5)}
                            </div>
                          )}
                        </div>
                      ) : booking.booking_date ? (
                        <div className="text-sm text-gray-900 font-medium">
                          {new Date(booking.booking_date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">未設定</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {booking.workshop?.title}
                      </div>
                      {booking.workshop?.location && (
                        <div className="text-xs text-gray-500">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {booking.participants}名
                      </span>
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const jstDate = new Date(new Date(booking.created_at).getTime() + 9 * 60 * 60 * 1000);
                          return jstDate.toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          });
                        })()}
                      </div>
                      <div className="text-xs text-gray-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {(() => {
                          const jstDate = new Date(new Date(booking.created_at).getTime() + 9 * 60 * 60 * 1000);
                          return jstDate.toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        })()}
                      </div>
                    </td>
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
                        <div className="text-xs text-gray-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          最大{workshop.max_participants}名 / {workshop.duration}分
                        </div>
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
      </div>
    </>
  )
}