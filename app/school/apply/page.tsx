'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, Tag, X, Shield, Clock, Gift, Check } from 'lucide-react'

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
      const customerData: { 
        email: string; 
        name: string; 
        phone: string;
        address?: string;
      } = {
        email: formData.email,
        name: formData.parentName,
        phone: formData.phone
      }
      
      // addressカラムが存在する場合のみ追加（移行中の互換性のため）
      if (formData.address) {
        customerData.address = formData.address
      }
      
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .upsert(customerData, {
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

      const data = await response.json()
      
      if (!response.ok) {
        console.error('API Error:', data)
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (!data.sessionId) {
        console.error('No sessionId in response:', data)
        throw new Error('No session ID returned from server')
      }
      
      // Stripeの決済ページへリダイレクト
      const stripe = await stripePromise
      if (!stripe) {
        throw new Error('Stripe not loaded')
      }
      
      const { error } = await stripe.redirectToCheckout({ sessionId: data.sessionId })
      if (error) {
        console.error('Stripe redirect error:', error)
        throw error
      }

    } catch (error) {
      console.error('Error creating enrollment:', error)
      const errorMessage = (error as Error)?.message || '申込の処理中にエラーが発生しました。'
      alert(`エラー: ${errorMessage}\n\nお手数ですが、時間をおいて再度お試しください。`)
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
        <Header />

        {/* Back Button */}
        <div className="pt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => router.push('/school')}
              className="flex items-center text-gray-600 hover:text-purple-600 font-semibold transition-all duration-200 hover:translate-x-[-4px] mb-8 group"
            >
              <ArrowLeft className="w-5 h-5 mr-2 group-hover:mr-3 transition-all" />
              スクール紹介に戻る
            </button>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-2xl p-6 md:p-10 border border-white/50">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4 shadow-lg">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-3">
                スクール申込フォーム
              </h1>
              <p className="text-gray-600">未来を創る第一歩を踏み出そう！</p>
            </div>

            {/* Selected Class Info */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600 rounded-3xl p-8 mb-10 shadow-xl">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl"></div>

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-white border border-white/30">
                    選択中のクラス
                  </span>
                  {selectedClass.id === 'basic' && (
                    <span className="inline-block bg-yellow-400 px-3 py-1 rounded-full text-xs font-bold text-gray-900">
                      一番人気
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-white mb-3">{selectedClass.name}</h2>
                <p className="text-purple-100 text-sm md:text-base leading-relaxed mb-6">{selectedClass.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-200">授業時間</p>
                      <p className="text-white font-bold">{selectedClass.duration}</p>
                    </div>
                  </div>

                  <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-200">開催頻度</p>
                      <p className="text-white font-bold">{selectedClass.frequency}</p>
                    </div>
                  </div>

                  {selectedClass.schedule && (
                    <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-purple-200">スケジュール</p>
                        <p className="text-white font-bold">{selectedClass.schedule}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <Gift className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-200">特典内容</p>
                      <p className="text-white font-bold text-sm">{selectedClass.perks}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Student Information */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                <div className="flex items-center mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">お子様の情報</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      お子様のお名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 transition-all"
                      value={formData.studentName}
                      onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                      placeholder="山田 花子"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      年齢 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="5"
                      max="18"
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 transition-all"
                      value={formData.studentAge}
                      onChange={(e) => setFormData({ ...formData, studentAge: e.target.value })}
                      placeholder="10"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      学年
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 transition-all"
                      value={formData.studentGrade}
                      onChange={(e) => setFormData({ ...formData, studentGrade: e.target.value })}
                      placeholder="小学4年生"
                    />
                  </div>
                </div>
              </div>

              {/* Parent Information */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center mb-5">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">保護者の情報</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      保護者のお名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="山田 太郎"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      電話番号 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="090-1234-5678"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="example@email.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      住所
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="東京都文京区..."
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  備考・ご要望など
                </label>
                <textarea
                  rows={4}
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-gray-900 transition-all"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="アレルギーや配慮が必要な事項があればご記入ください"
                />
              </div>

              {/* Coupon Code */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-200">
                <label className="flex items-center text-base font-bold text-gray-900 mb-3">
                  <Tag className="w-5 h-5 mr-2 text-amber-600" />
                  クーポンコード
                </label>
                {!appliedCoupon ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      className="flex-1 px-4 py-3.5 bg-white border-2 border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 uppercase text-gray-900 font-mono text-center sm:text-left transition-all"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="SCHOOL2024"
                    />
                    <button
                      type="button"
                      onClick={validateCoupon}
                      disabled={!couponCode.trim() || couponValidation.loading}
                      className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                    >
                      {couponValidation.loading ? '検証中...' : '適用する'}
                    </button>
                  </div>
                ) : (
                  <div className="bg-green-50 border-2 border-green-300 rounded-xl p-5 flex items-center justify-between shadow-sm">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-900">
                          {appliedCoupon.code}
                        </p>
                        <p className="text-xs text-green-700 mt-0.5">
                          {appliedCoupon.description || 'クーポンが適用されました'}
                        </p>
                        <p className="text-xs text-green-600 font-semibold mt-1">
                          {appliedCoupon.discount_type === 'percentage'
                            ? `${appliedCoupon.discount_value}%割引`
                            : `¥${appliedCoupon.discount_value.toLocaleString()}割引`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-green-600 hover:text-green-800 hover:bg-green-100 p-2 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
                {couponValidation.error && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center">
                    <X className="w-4 h-4 text-red-500 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700">{couponValidation.error}</p>
                  </div>
                )}
              </div>

              {/* Price Summary */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-gray-700 rounded-xl flex items-center justify-center mr-3">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">料金明細</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <span className="text-gray-700 font-medium">入会金（初回のみ）</span>
                    <span className="text-xl font-bold text-gray-900">
                      ¥{selectedClass.registrationFee.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-gray-200">
                    <div>
                      <span className="text-gray-700 font-medium">初月月謝</span>
                      {selectedClass.id === 'free' && (
                        <span className="ml-2 text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full font-bold shadow-sm">入会無料特典</span>
                      )}
                    </div>
                    <div className="text-right">
                      {selectedClass.id === 'free' ? (
                        <>
                          <span className="text-lg text-gray-400 line-through mr-2">
                            ¥{selectedClass.price.toLocaleString()}
                          </span>
                          <span className="text-xl text-green-600 font-black">
                            ¥0
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-bold text-gray-900">
                          ¥{selectedClass.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center py-3 border-b border-green-200 bg-green-50 -mx-8 px-8 rounded-lg">
                      <span className="text-green-700 font-semibold flex items-center">
                        <Tag className="w-4 h-4 mr-2" />
                        クーポン割引
                      </span>
                      <span className="text-xl font-bold text-green-600">-¥{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-6 mt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">初回お支払い金額</span>
                      <div className="text-right">
                        <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                          ¥{finalAmount.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">（税込）</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 mt-6 border border-blue-200">
                  <div className="flex items-center mb-3">
                    <Clock className="w-5 h-5 text-blue-600 mr-2" />
                    <p className="text-sm text-blue-900 font-bold">お支払いについて</p>
                  </div>
                  <ul className="text-sm text-blue-800 space-y-2">
                    {selectedClass.id === 'free' ? (
                      <>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">✓</span>
                          <span>初月（入会月）の月謝は<span className="font-bold text-green-700">無料</span>です</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">✓</span>
                          <span>本日は入会金のみをお支払いいただきます</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">✓</span>
                          <span>翌月から月謝<span className="font-bold">¥{selectedClass.price.toLocaleString()}</span>が自動引き落としとなります</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">✓</span>
                          <span>本日は入会金と初月月謝をお支払いいただきます</span>
                        </li>
                        <li className="flex items-start">
                          <span className="text-blue-600 mr-2">✓</span>
                          <span>翌月から月謝<span className="font-bold">¥{selectedClass.price.toLocaleString()}</span>が自動引き落としとなります</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Terms Agreement */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 border-2 border-gray-400 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    <a href="/terms" target="_blank" className="text-purple-600 hover:text-purple-700 underline font-semibold">利用規約</a>
                    と
                    <a href="/privacy" target="_blank" className="text-purple-600 hover:text-purple-700 underline font-semibold">プライバシーポリシー</a>
                    に同意します <span className="text-red-500 font-bold">*</span>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting || !agreedToTerms}
                  className="relative w-full py-5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white text-lg font-black rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        処理中...
                      </>
                    ) : (
                      <>
                        <Shield className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                        決済画面へ進む
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>

                <div className="mt-5 flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-lg py-3 px-4">
                  <Shield className="w-5 h-5 mr-2 text-gray-400" />
                  <span>安全な決済は<span className="font-semibold text-gray-700">Stripe</span>で処理されます</span>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  )
}