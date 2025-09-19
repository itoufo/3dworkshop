'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import { loadStripe } from '@stripe/stripe-js'
import Image from 'next/image'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Clock, MapPin, Users, ArrowLeft, Shield, Sparkles, User, Mail, Phone, Heart, Tag, X } from 'lucide-react'
import styles from './workshop.module.css'

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
    coupon?: {id: string; code: string; description?: string; discount_type: 'percentage' | 'fixed_amount'; discount_value: number}
  }>({ loading: false, valid: false })
  const [appliedCoupon, setAppliedCoupon] = useState<{id: string; code: string; description?: string; discount_type: 'percentage' | 'fixed_amount'; discount_value: number} | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [availability, setAvailability] = useState<{
    available_spots: number
    is_full: boolean
    manual_participants: number
    booked_participants: number
  } | null>(null)

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
        // タイトルを動的に設定
        if (data) {
          document.title = `${data.title} | 3Dプリンタ教室 3DLab`
        }
        // 残席数を取得
        fetchAvailability(params.id as string)
      }
      setLoading(false)
    }
    
    fetchWorkshop()
  }, [params.id])

  async function fetchAvailability(workshopId: string) {
    try {
      const response = await fetch(`/api/check-availability?workshopId=${workshopId}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }

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
    } catch {
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
    
    if (!workshop || submitting) return

    setSubmitting(true)

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

    } catch {
      console.error('Error creating booking')
      alert('予約の作成中にエラーが発生しました。')
      setSubmitting(false)
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
    <>
      {submitting && <LoadingOverlay message="決済画面へ移動しています..." />}
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
                  className={styles.workshopContent}
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
                    <h4 className="font-semibold text-gray-900">作品は後日発送</h4>
                    <p className="text-sm text-gray-600">制作した作品は後日発送いたします</p>
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

            {/* Access Section */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">アクセス</h3>

              {/* Map */}
              <div className="rounded-xl overflow-hidden shadow-md h-64 mb-6">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.0302599999997!2d139.7671258!3d35.7051736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188ea6490c7a0b%3A0xf7e6918f7f01c837!2z5qCq5byP5Lya56S-44Km44Kp44O844Kr44O8!5e0!3m2!1sja!2sjp!4v1736922000000!5m2!1sja!2sjp"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="3DLabの地図"
                />
              </div>

              {/* Address */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="font-bold text-gray-900 mb-2">📍 3DLab</h4>
                <address className="not-italic text-gray-700">
                  <p className="text-sm">〒113-0034</p>
                  <p>東京都文京区湯島3-14-8</p>
                  <p>加田湯島ビル 5F</p>
                </address>
              </div>

              {/* Station Access */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <span>🚇</span>
                  <span className="text-gray-700">東京メトロ千代田線 湯島駅 3番出口から徒歩1分</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span>🚃</span>
                  <span className="text-gray-700">JR御徒町駅 南口から徒歩8分</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span>🚇</span>
                  <span className="text-gray-700">JR秋葉原駅 電気街口から徒歩10分</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span>🚉</span>
                  <span className="text-gray-700">丸ノ内線 御茶ノ水駅 聖橋口から徒歩12分</span>
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
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium text-gray-900">
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
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium text-gray-900">
                        {workshop.event_time.slice(0, 5)} 開始（{workshop.duration}分間）
                      </span>
                    </div>
                  )}
                  {workshop.location && (
                    <div className="flex items-center text-sm text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                      <span className="font-medium text-gray-900">{workshop.location}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-700">
                    <Users className="w-4 h-4 mr-2 text-purple-600" />
                    <span className="font-medium text-gray-900">
                      定員 {workshop.max_participants}名
                      {availability && (
                        <>
                          {availability.is_full ? (
                            <span className="ml-2 text-red-600 font-bold">（満席）</span>
                          ) : (
                            <span className="ml-2 text-green-600">
                              （残り{availability.available_spots}名）
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  {availability && availability.manual_participants > 0 && (
                    <div className="text-xs text-orange-600 ml-6">
                      ※ 他媒体からの予約: {availability.manual_participants}名
                    </div>
                  )}
                </div>
              </div>
              
              {availability?.is_full ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <p className="text-red-800 font-semibold mb-2">このワークショップは満席です</p>
                  <p className="text-sm text-red-600">キャンセル待ちをご希望の場合は、お問い合わせください。</p>
                </div>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    参加人数
                  </label>
                  <select
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                    value={booking.participants}
                    onChange={(e) => setBooking({ ...booking, participants: parseInt(e.target.value) })}
                  >
                    {[...Array(Math.min(availability?.available_spots || workshop.max_participants, 5))].map((_, i) => (
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
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
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '処理中...' : '決済画面へ進む'}
                  </button>
                  
                  <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                    <Shield className="w-4 h-4 mr-1" />
                    安全な決済はStripeで処理されます
                  </div>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  )
}