'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Tag, X, Shield, Clock, Gift } from 'lucide-react'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface SchoolClass {
  id: 'free' | 'basic'
  name: string
  description: string
  price: number
  registrationFee: number
  duration: string
  frequency: string
  perks: string
  schedule?: string
}

const classes: Record<string, SchoolClass> = {
  free: {
    id: 'free',
    name: '自由創作クラス（教室開放）',
    description: 'PCや有料版AIを自由に使いながら、自分のアイデアをとことん形にできるクラス',
    price: 17000,
    registrationFee: 22000, // 20000円（税別）= 22000円（税込）
    duration: '120分/回',
    frequency: '開校日の好きな日に月2回',
    perks: '制作し放題（時間内）'
  },
  basic: {
    id: 'basic',
    name: '基本実践クラス（授業＋作品作り）',
    description: 'AIの使い方や3Dプリンターの基礎を授業で学び、実際に作品を制作していくクラス',
    price: 30000,
    registrationFee: 22000, // 20000円（税別）= 22000円（税込）
    duration: '90分/回',
    frequency: '月2回',
    schedule: '授業日：土・日曜日',
    perks: '月1作品（例：オリジナルフィギュア）'
  }
}

export default function SchoolApplyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const classType = searchParams.get('class') || 'basic'
  const selectedClass = classes[classType] || classes.basic
  
  const [formData, setFormData] = useState({
    studentName: '',
    studentAge: '',
    studentGrade: '',
    parentName: '',
    email: '',
    phone: '',
    address: '',
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
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  async function validateCoupon() {
    if (!couponCode.trim()) return

    setCouponValidation({ loading: true, valid: false })

    try {
      const response = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          amount: selectedClass.price + selectedClass.registrationFee,
          type: 'school',
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
    
    if (!agreedToTerms || submitting) return

    setSubmitting(true)

    try {
      // 顧客情報を保存または更新
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert({
          email: formData.email,
          name: formData.parentName,
          phone: formData.phone,
          address: formData.address
        }, {
          onConflict: 'email'
        })
        .select()
        .single()

      if (customerError) throw customerError

      // スクール申込情報を保存
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('school_enrollments')
        .insert({
          customer_id: customer.id,
          class_type: selectedClass.id,
          class_name: selectedClass.name,
          student_name: formData.studentName,
          student_age: parseInt(formData.studentAge),
          student_grade: formData.studentGrade,
          monthly_fee: selectedClass.price,
          registration_fee: selectedClass.registrationFee,
          total_amount: totalAmount, // basicは入会金+初月月謝、freeは入会金のみ
          notes: formData.notes,
          status: 'pending',
          payment_status: 'pending',
          enrollment_date: new Date().toISOString()
        })
        .select()
        .single()

      if (enrollmentError) throw enrollmentError

      // Stripe決済セッションを作成
      const response = await fetch('/api/create-school-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enrollment_id: enrollmentData.id,
          class_type: selectedClass.id,
          customer_email: formData.email,
          monthly_fee: selectedClass.price,
          registration_fee: selectedClass.registrationFee,
          coupon_id: appliedCoupon?.id,
          discount_amount: couponValidation.discount_amount || 0
        }),
      })

      const { sessionId } = await response.json()
      
      // Stripeの決済ページへリダイレクト
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId })

    } catch (error) {
      console.error('Error creating enrollment:', error)
      alert('申込の処理中にエラーが発生しました。')
      setSubmitting(false)
    }
  }

  // basicクラスは初月月謝も請求、freeクラスは入会金のみ
  const totalAmount = selectedClass.id === 'basic' 
    ? selectedClass.registrationFee + selectedClass.price 
    : selectedClass.registrationFee
  const discountAmount = couponValidation.discount_amount || 0
  const finalAmount = totalAmount - discountAmount

  return (
    <>
      {submitting && <LoadingOverlay message="決済画面へ移動しています..." />}
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <Header />

        {/* Back Button */}
        <div className="pt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.push('/school')}
              className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              スクール紹介に戻る
            </button>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              スクール申込フォーム
            </h1>

            {/* Selected Class Info */}
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedClass.name}</h2>
              <p className="text-gray-700 mb-4">{selectedClass.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">{selectedClass.duration}</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">{selectedClass.frequency}</p>
                  </div>
                </div>
                {selectedClass.schedule && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-gray-900 font-medium">{selectedClass.schedule}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start">
                  <Gift className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900 font-medium">{selectedClass.perks}</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Information */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">お子様の情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      お子様のお名前 *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="山田 花子"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      年齢 *
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="18"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.studentAge}
                      onChange={(e) => setFormData({ ...formData, studentAge: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      学年
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.studentGrade}
                      onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                      placeholder="小学4年生"
                    />
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">保護者の情報</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      保護者のお名前 *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="山田 太郎"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      電話番号 *
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="090-1234-5678"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      メールアドレス *
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      住所
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="東京都文京区..."
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  備考・ご要望など
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase text-gray-900"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="SCHOOL2024"
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
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">料金明細</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">入会金（初回のみ）</span>
                    <span className="text-lg text-gray-900">
                      ¥{selectedClass.registrationFee.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-600">初月月謝</span>
                      {selectedClass.id === 'free' && (
                        <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">無料特典</span>
                      )}
                    </div>
                    <div className="text-right">
                      {selectedClass.id === 'free' ? (
                        <>
                          <span className="text-lg text-gray-400 line-through">
                            ¥{selectedClass.price.toLocaleString()}
                          </span>
                          <span className="text-lg text-green-600 font-bold ml-2">
                            ¥0
                          </span>
                        </>
                      ) : (
                        <span className="text-lg text-gray-900 font-semibold">
                          ¥{selectedClass.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>クーポン割引</span>
                      <span>-¥{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">初回お支払い金額</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ¥{finalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 mt-4">
                  <p className="text-sm text-blue-900 font-medium mb-1">お支払いについて</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    {selectedClass.id === 'free' ? (
                      <>
                        <li>• 初月（入会月）の月謝は<span className="font-bold">無料</span>です</li>
                        <li>• 本日は入会金のみをお支払いいただきます</li>
                        <li>• 翌月から月謝¥{selectedClass.price.toLocaleString()}が自動引き落としとなります</li>
                      </>
                    ) : (
                      <>
                        <li>• 本日は入会金と初月月謝をお支払いいただきます</li>
                        <li>• 翌月から月謝¥{selectedClass.price.toLocaleString()}が自動引き落としとなります</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="bg-purple-50 rounded-xl p-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    利用規約とプライバシーポリシーに同意します *
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting || !agreedToTerms}
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
          </div>
        </main>
      </div>
    </>
  )
}