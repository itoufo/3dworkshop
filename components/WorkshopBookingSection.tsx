'use client'

import { useState, useEffect } from 'react'
import { Workshop } from '@/types'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Clock, MapPin, Users, Shield, User, Mail, Phone, Tag, X, ArrowRight } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface WorkshopBookingSectionProps {
  workshop: Workshop
  relatedWorkshops: Workshop[]
  isPastWorkshop: boolean
}

export default function WorkshopBookingSection({ workshop, relatedWorkshops, isPastWorkshop }: WorkshopBookingSectionProps) {
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
    if (!isPastWorkshop) {
      fetchAvailability(workshop.id)
    }
  }, [workshop.id, isPastWorkshop])

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
    if (!couponCode.trim()) return

    setCouponValidation({ loading: true, valid: false })

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          workshopId: workshop.id,
          amount: workshop.price * booking.participants,
          customerId: null
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

    if (submitting) return

    setSubmitting(true)

    try {
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

      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId })

    } catch {
      console.error('Error creating booking')
      alert('予約の作成中にエラーが発生しました。')
      setSubmitting(false)
    }
  }

  if (isPastWorkshop) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-24">
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-6 text-center mb-6">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">このワークショップは終了しました</h2>
          <p className="text-sm text-gray-500">
            {workshop.event_date && new Date(workshop.event_date).toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}に開催されました
          </p>
        </div>

        {relatedWorkshops.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">次回の開催予定</h3>
            <div className="space-y-3">
              {relatedWorkshops.map((rw) => (
                <a
                  key={rw.id}
                  href={`/workshops/${rw.id}`}
                  className="block p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm mb-1">{rw.title}</p>
                  {rw.event_date && (
                    <p className="text-sm text-purple-600 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(rw.event_date).toLocaleDateString('ja-JP', {
                        month: 'long', day: 'numeric', weekday: 'short'
                      })}
                      {rw.event_time && ` ${rw.event_time.slice(0, 5)}〜`}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    詳細を見る <ArrowRight className="w-3 h-3 ml-1" />
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}

        {workshop.category && (
          <div className="mt-6 text-center">
            <a
              href={`/workshops/category/${workshop.category.slug}`}
              className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              「{workshop.category.name}」の全日程を見る
              <ArrowRight className="w-4 h-4 ml-1" />
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {submitting && <LoadingOverlay message="決済画面へ移動しています..." />}
      <div id="booking-form" className="bg-white rounded-2xl shadow-xl p-8 sticky top-24">
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
            <label htmlFor="booking-participants" className="block text-sm font-medium text-gray-700 mb-2">
              参加人数
            </label>
            <select
              id="booking-participants"
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
            <label htmlFor="booking-name" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              お名前
            </label>
            <input
              id="booking-name"
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
            <label htmlFor="booking-email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              メールアドレス
            </label>
            <input
              id="booking-email"
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
            <label htmlFor="booking-phone" className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              電話番号
            </label>
            <input
              id="booking-phone"
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
              <label htmlFor="booking-age" className="block text-sm font-medium text-gray-700 mb-2">
                年齢 *
              </label>
              <input
                id="booking-age"
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
              <label htmlFor="booking-gender" className="block text-sm font-medium text-gray-700 mb-2">
                性別 *
              </label>
              <select
                id="booking-gender"
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
            <label htmlFor="booking-notes" className="block text-sm font-medium text-gray-700 mb-2">
              備考・質問など
            </label>
            <textarea
              id="booking-notes"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
              value={booking.notes}
              onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
              placeholder="アレルギーや配慮が必要な事項があればご記入ください"
            />
          </div>

          {/* Coupon Code */}
          <div>
            <label htmlFor="booking-coupon" className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              クーポンコード
            </label>
            {!appliedCoupon ? (
              <div className="flex space-x-2">
                <input
                  id="booking-coupon"
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

      {/* Floating Booking Button (Mobile Only) */}
      {!availability?.is_full && (
        <button
          onClick={() => {
            const bookingForm = document.getElementById('booking-form')
            if (bookingForm) {
              bookingForm.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
          }}
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center space-x-2 font-semibold"
        >
          <Calendar className="w-5 h-5" />
          <span>予約する</span>
        </button>
      )}
    </>
  )
}
