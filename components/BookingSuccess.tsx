'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { gaEvent, GA_CURRENCY } from '@/lib/gtag'
import { formatPrice } from '@/lib/price'
import { enDateMedium, type Locale } from '@/lib/i18n'

// 予約完了ページの本体。/success（日本語）と /en/success（英語）の両方から使う。
// ⚠ 'ja' の文言は従来の /success と同じに保つ
const TEXT = {
  ja: {
    noSession: 'セッション情報が見つかりません',
    confirmFailed: '決済の確認に失敗しました',
    bookingFailed: '予約の確定に失敗しました',
    confirming: '予約を確定しています...',
    notFound: '予約情報が見つかりません',
    backHome: 'トップページへ戻る',
    title: '予約が完了しました！',
    thanks: 'ご予約ありがとうございます。確認メールをお送りしました。',
    details: '予約詳細',
    workshop: 'ワークショップ',
    dateTime: '予約日時',
    participants: '参加人数',
    people: (n: number) => `${n}名`,
    companion: '同伴者（付き添い）',
    companionValue: (n: number) => `${n}名（無料）`,
    name: 'お名前',
    email: 'メールアドレス',
    total: '合計金額',
    loading: '読み込み中...',
    home: '/',
    date: (date: string, time: string) => `${new Date(date).toLocaleDateString('ja-JP')} ${time}`,
  },
  en: {
    noSession: 'We could not find your booking session.',
    confirmFailed: 'We could not confirm your payment.',
    bookingFailed: 'We could not confirm your booking.',
    confirming: 'Confirming your booking...',
    notFound: 'We could not find your booking.',
    backHome: 'Back to the top page',
    title: 'Your booking is complete!',
    thanks: 'Thank you for booking. We have sent a confirmation email (in Japanese). If you have any questions, email us at 3dlab@sunu25.com.',
    details: 'Booking details',
    workshop: 'Workshop',
    dateTime: 'Date & time',
    participants: 'Participants',
    people: (n: number) => `${n} ${n === 1 ? 'person' : 'people'}`,
    companion: 'Accompanying parent',
    companionValue: (n: number) => `${n} (free)`,
    name: 'Name',
    email: 'Email',
    total: 'Total',
    loading: 'Loading...',
    home: '/en',
    date: (date: string, time: string) => `${enDateMedium(date)}, ${time.slice(0, 5)} (JST)`,
  },
}

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
}

interface Workshop {
  id: string
  title: string
  description: string
  price: number
  duration: string
  location?: string
}

interface Booking {
  id: string
  workshop_id: string
  customer_id: string
  booking_date: string
  booking_time: string
  participants: number
  companion_count?: number | null
  total_amount: number
  discount_amount?: number | null
  status: string
  payment_status: string
  workshop?: Workshop
  customer?: Customer
}

function SuccessContent({ locale }: { locale: Locale }) {
  const t = TEXT[locale]
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    // 無料ワークショップは Stripe を経由しないため booking_id で戻ってくる
    const bookingId = searchParams.get('booking_id')

    if (sessionId || bookingId) {
      confirmPayment(sessionId, bookingId)
    } else {
      setError(t.noSession)
      setLoading(false)
    }
  }, [searchParams])

  async function confirmPayment(sessionId: string | null, bookingId: string | null) {
    try {
      // APIエンドポイントを呼び出してStripeセッションを検証し、予約を確定
      // （無料回は決済済みではなく、確定済みの予約を booking_id で読み出すだけ）
      const response = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionId ? { sessionId } : { bookingId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error((locale === 'ja' && data.error) || t.confirmFailed)
      }

      setBooking(data.booking)

      // GA4: purchase。session_id（無料回は booking_id）単位で1回だけ送り、
      // リロード/再描画の二重計上を防ぐ
      const purchaseKey = `ga_purchase_${sessionId || bookingId}`
      if (data.booking && !sessionStorage.getItem(purchaseKey)) {
        sessionStorage.setItem(purchaseKey, '1')
        const b: Booking = data.booking
        // 実際の請求額（割引後）を送る。クーポン/早割で total_amount と実売上がずれるため、
        // ROAS が過大にならないよう discount_amount を差し引く（Stripe 実請求と一致）。
        const netValue = Math.max(0, b.total_amount - (b.discount_amount ?? 0))
        gaEvent('purchase', {
          transaction_id: b.id,
          currency: GA_CURRENCY,
          value: netValue,
          items: [{
            item_id: b.workshop_id,
            item_name: b.workshop?.title,
            price: b.workshop?.price,
            quantity: b.participants,
          }],
        })
      }
    } catch (error) {
      console.error('Error confirming payment:', error)
      setError(error instanceof Error ? error.message : t.bookingFailed)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>{t.confirming}</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || t.notFound}</p>
          <Link href={t.home} className="text-indigo-600 hover:underline">
            {t.backHome}
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.thanks}</p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold mb-4">{t.details}</h2>
            
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">{t.workshop}</dt>
                <dd className="font-medium">{booking.workshop?.title}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">{t.dateTime}</dt>
                <dd className="font-medium">
                  {t.date(booking.booking_date, booking.booking_time)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">{t.participants}</dt>
                <dd className="font-medium">{t.people(booking.participants)}</dd>
              </div>
              {booking.companion_count != null && booking.companion_count > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">{t.companion}</dt>
                  <dd className="font-medium">{t.companionValue(booking.companion_count)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-600">{t.name}</dt>
                <dd className="font-medium">{booking.customer?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">{t.email}</dt>
                <dd className="font-medium">{booking.customer?.email}</dd>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <dt className="text-gray-900 font-semibold">{t.total}</dt>
                <dd className="font-bold text-xl">{formatPrice(booking.total_amount)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href={t.home}
              className="bg-indigo-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
            >
              {t.backHome}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BookingSuccess({ locale = 'ja' }: { locale?: Locale }) {
  return (
    <>
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>{TEXT[locale].loading}</p>
        </div>
      </div>
    }>
      <SuccessContent locale={locale} />
    </Suspense>
    <Footer />
    </>
  )
}