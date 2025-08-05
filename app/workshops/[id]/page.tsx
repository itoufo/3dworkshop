'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import { loadStripe } from '@stripe/stripe-js'
import Image from 'next/image'
import Header from '@/components/Header'
import { Calendar, Clock, MapPin, Users, ArrowLeft, Shield, Sparkles, User, Mail, Phone, UserCircle, Heart, Tag, X } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function WorkshopDetail() {
  const params = useParams()
  const router = useRouter()
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState({
    participants: 1,
    name: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    notes: ''
  })
  const [couponCode, setCouponCode] = useState('')
  const [couponValidation, setCouponValidation] = useState<{
    loading: boolean
    valid: boolean
    error?: string
    discount_amount?: number
    coupon?: any
  }>({ loading: false, valid: false })
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)

  useEffect(() => {
    async function fetchWorkshop() {
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Error fetching workshop:', error)
      } else {
        setWorkshop(data as Workshop)
      }
      setLoading(false)
    }
    
    fetchWorkshop()
  }, [params.id])

  async function validateCoupon() {
    if (!couponCode.trim() || !workshop) return

    setCouponValidation({ loading: true, valid: false })

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          workshopId: workshop.id,
          amount: workshop.price * booking.participants,
          customerId: null // 新規顧客の場合はnull
        })
      })

      const data = await response.json()

      if (response.ok) {
        setCouponValidation({
          loading: false,
          valid: true,
          discount_amount: data.discount_amount,
          coupon: data.coupon
        })
        setAppliedCoupon(data.coupon)
      } else {
        setCouponValidation({
          loading: false,
          valid: false,
          error: data.error
        })
      }
    } catch (error) {
      setCouponValidation({
        loading: false,
        valid: false,
        error: 'クーポンの検証中にエラーが発生しました'
      })
    }
  }

  function removeCoupon() {
    setCouponCode('')
    setCouponValidation({ loading: false, valid: false })
    setAppliedCoupon(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!workshop) return

    try {
      // 顧客情報を保存または更新
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          email: booking.email,
          name: booking.name,
          phone: booking.phone,
          age: booking.age ? parseInt(booking.age) : null,
          gender: booking.gender || null
        }, {
          onConflict: 'email'
        })
        .select()
        .single()

      if (customerError) throw customerError

      // 予約情報を保存（ワークショップの日時を使用）
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          workshop_id: workshop.id,
          customer_id: customer.id,
          booking_date: workshop.event_date || new Date().toISOString().split('T')[0],
          booking_time: workshop.event_time || '10:00',
          participants: booking.participants,
          total_amount: workshop.price * booking.participants,
          notes: booking.notes,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single()

      if (bookingError) throw bookingError

      // Stripe決済セッションを作成
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshop_id: workshop.id,
          booking_id: bookingData.id,
          customer_email: booking.email,
          amount: workshop.price * booking.participants,
          participants: booking.participants,
          coupon_id: appliedCoupon?.id,
          discount_amount: couponValidation.discount_amount || 0
        }),
      })

      const { sessionId } = await response.json()
      
      // Stripeの決済ページへリダイレクト
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId })

    } catch (error) {
      console.error('Error creating booking:', error)
      alert('予約の作成中にエラーが発生しました。')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">ワークショップが見つかりません</p>
          <button
            onClick={() => router.push('/')}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            トップへ戻る
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      {/* Back Button */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            一覧に戻る
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column - Workshop Details */}
          <div className="lg:col-span-2">
            {/* Image */}
            {workshop.image_url ? (
              <div className="relative w-full h-96 rounded-2xl overflow-hidden mb-8">
                <Image
                  src={workshop.image_url}
                  alt={workshop.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              </div>
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-8">
                <div className="w-32 h-32 bg-white/50 rounded-3xl flex items-center justify-center">
                  <span className="text-5xl font-bold text-purple-600">3D</span>
                </div>
              </div>
            )}

            {/* Title and Description */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{workshop.title}</h1>
              <p className="text-lg text-gray-600">{workshop.description}</p>
            </div>

            {/* Rich Description */}
            {workshop.rich_description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">ワークショップの詳細</h2>
                <div 
                  className="prose prose-lg prose-purple max-w-none"
                  dangerouslySetInnerHTML={{ __html: workshop.rich_description }}
                />
              </div>
            )}

            {/* Features */}
            <div className="bg-purple-50 rounded-2xl p-8 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">このワークショップの特徴</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">初心者歓迎</h4>
                    <p className="text-sm text-gray-600">基礎から丁寧に指導します</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">安全対策</h4>
                    <p className="text-sm text-gray-600">機器の安全な使い方を学べます</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">作品持ち帰り</h4>
                    <p className="text-sm text-gray-600">制作した作品はお持ち帰りいただけます</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">少人数制</h4>
                    <p className="text-sm text-gray-600">一人ひとりに寄り添った指導</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-24">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">予約フォーム</h2>
              
              {/* Event Info Card */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">開催情報</h3>
                <div className="space-y-3">
                  {workshop.event_date && (
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium">
                        {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </span>
                    </div>
                  )}
                  {workshop.event_time && (
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium">
                        {workshop.event_time.slice(0, 5)} 開始（{workshop.duration}分間）
                      </span>
                    </div>
                  )}
                  {workshop.location && (
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium">{workshop.location}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Users className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="font-medium">定員 {workshop.max_participants}名</span>
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参加人数
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={booking.participants}
                    onChange={(e) => setBooking({ ...booking, participants: parseInt(e.target.value) })}
                  >
                    {[...Array(Math.min(workshop.max_participants, 5))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}名
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    お名前
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={booking.name}
                    onChange={(e) => setBooking({ ...booking, name: e.target.value })}
                    placeholder="山田 太郎"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={booking.email}
                    onChange={(e) => setBooking({ ...booking, email: e.target.value })}
                    placeholder="example@email.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    電話番号
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={booking.phone}
                    onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                    placeholder="090-1234-5678"
                  />
                </div>

                {/* Age and Gender */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年齢 *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="150"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={booking.age}
                      onChange={(e) => setBooking({ ...booking, age: e.target.value })}
                      placeholder="25"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      性別 *
                    </label>
                    <select
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      value={booking.gender}
                      onChange={(e) => setBooking({ ...booking, gender: e.target.value })}
                    >
                      <option value="">選択</option>
                      <option value="male">男性</option>
                      <option value="female">女性</option>
                      <option value="other">その他</option>
                      <option value="prefer_not_to_say">回答しない</option>
                    </select>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    備考・質問など
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    value={booking.notes}
                    onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                    placeholder="アレルギーや配慮が必要な事項があればご記入ください"
                  />
                </div>

                {/* Coupon Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    クーポンコード
                  </label>
                  {!appliedCoupon ? (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all uppercase"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="SUMMER2024"
                      />
                      <button
                        type="button"
                        onClick={validateCoupon}
                        disabled={!couponCode.trim() || couponValidation.loading}
                        className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        {couponValidation.loading ? '検証中...' : '適用'}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          ✓ {appliedCoupon.code} - {appliedCoupon.description || 'クーポンが適用されました'}
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          {appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}%割引` 
                            : `¥${appliedCoupon.discount_value.toLocaleString()}割引`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  {couponValidation.error && (
                    <p className="text-sm text-red-600 mt-2">{couponValidation.error}</p>
                  )}
                </div>

                {/* Price Summary */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">参加費 × {booking.participants}名</span>
                      <span className="text-lg text-gray-900">
                        ¥{(workshop.price * booking.participants).toLocaleString()}
                      </span>
                    </div>
                    {couponValidation.valid && couponValidation.discount_amount && (
                      <div className="flex justify-between items-center text-green-600">
                        <span>クーポン割引</span>
                        <span>-¥{couponValidation.discount_amount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-gray-900 font-semibold">合計金額</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ¥{((workshop.price * booking.participants) - (couponValidation.discount_amount || 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-6">
                    ※ 料金には材料費・設備使用料が含まれています
                  </p>
                  
                  <button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  >
                    決済画面へ進む
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                    <Shield className="w-4 h-4 mr-1" />
                    安全な決済はStripeで処理されます
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}