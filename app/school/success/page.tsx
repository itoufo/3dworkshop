'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import { CheckCircle, Calendar, Mail, Home, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function SchoolSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')
  const [enrollmentDetails, setEnrollmentDetails] = useState<{
    id: string
    name: string
    email: string
    program: string
    created_at: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchEnrollmentDetails() {
      if (!sessionId) {
        router.push('/school')
        return
      }

      try {
        // Stripe session IDを使って申込情報を取得
        const { data, error } = await supabase
          .from('school_enrollments')
          .select(`
            *,
            customer:customers(*)
          `)
          .eq('stripe_payment_intent_id', sessionId)
          .single()

        if (error) {
          console.error('Error fetching enrollment:', error)
        } else {
          setEnrollmentDetails(data)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEnrollmentDetails()
  }, [sessionId, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!enrollmentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <Header />
        <div className="pt-32 px-4 text-center">
          <p className="text-gray-600">申込情報が見つかりません</p>
          <Link 
            href="/school"
            className="mt-4 inline-block text-purple-600 hover:text-purple-700"
          >
            スクールページに戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Success Message */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              お申込みありがとうございます！
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              スクール申込が正常に完了しました。<br />
              ご登録いただいたメールアドレスに確認メールをお送りしました。
            </p>

            {/* Enrollment Details */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 text-left">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">申込内容</h2>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <BookOpen className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">クラス</p>
                    <p className="font-medium text-gray-900">{enrollmentDetails.class_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">お子様のお名前</p>
                    <p className="font-medium text-gray-900">{enrollmentDetails.student_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-purple-600 mt-0.5 mr-3" />
                  <div>
                    <p className="text-sm text-gray-600">メールアドレス</p>
                    <p className="font-medium text-gray-900">{enrollmentDetails.customer?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">今後の流れ</h3>
              
              <ol className="space-y-3 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">1.</span>
                  <span>確認メールに記載された内容をご確認ください</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">2.</span>
                  <span>初回授業日の詳細を別途メールでご案内いたします</span>
                </li>
                <li className="flex items-start">
                  <span className="font-bold text-blue-600 mr-2">3.</span>
                  <span>ご不明な点がございましたら、お気軽にお問い合わせください</span>
                </li>
              </ol>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <p className="text-sm text-gray-600 mb-2">お問い合わせ</p>
              <p className="font-medium text-gray-900">080-9453-0911</p>
              <p className="font-medium text-gray-900">y-sato@sunu25.com</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
              >
                <Home className="w-5 h-5 mr-2" />
                トップページへ
              </Link>
              
              <Link
                href="/school"
                className="inline-flex items-center justify-center px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 font-semibold rounded-xl hover:bg-purple-50 transition-all duration-300"
              >
                スクール情報を見る
              </Link>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
            <p className="text-sm text-yellow-800">
              <strong>重要：</strong>メールが届かない場合は、迷惑メールフォルダをご確認いただくか、<br />
              お電話にてお問い合わせください。
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}