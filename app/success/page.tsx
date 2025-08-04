'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')

    if (sessionId) {
      confirmPayment(sessionId)
    } else {
      setError('セッション情報が見つかりません')
      setLoading(false)
    }
  }, [searchParams])

  async function confirmPayment(sessionId: string) {
    try {
      // APIエンドポイントを呼び出してStripeセッションを検証し、予約を確定
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '決済の確認に失敗しました')
      }

      setBooking(data.booking)
    } catch (error) {
      console.error('Error confirming payment:', error)
      setError(error instanceof Error ? error.message : '予約の確定に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>予約を確定しています...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '予約情報が見つかりません'}</p>
          <Link href="/" className="text-indigo-600 hover:underline">
            トップページへ戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">予約が完了しました！</h1>
            <p className="text-gray-600">ご予約ありがとうございます。確認メールをお送りしました。</p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold mb-4">予約詳細</h2>
            
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">ワークショップ</dt>
                <dd className="font-medium">{booking.workshop?.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">予約日時</dt>
                <dd className="font-medium">
                  {new Date(booking.booking_date).toLocaleDateString('ja-JP')} {booking.booking_time}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">参加人数</dt>
                <dd className="font-medium">{booking.participants}名</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">お名前</dt>
                <dd className="font-medium">{booking.customer?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">メールアドレス</dt>
                <dd className="font-medium">{booking.customer?.email}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <dt className="text-gray-900 font-semibold">合計金額</dt>
                <dd className="font-bold text-xl">¥{booking.total_amount.toLocaleString()}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
            >
              トップページへ戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}