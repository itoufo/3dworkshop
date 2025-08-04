'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import { loadStripe } from '@stripe/stripe-js'
import Image from 'next/image'

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
          participants: booking.participants
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
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>
  }

  if (!workshop) {
    return <div className="min-h-screen flex items-center justify-center">ワークショップが見つかりません</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 戻る
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            {workshop.image_url && (
              <div className="relative w-full h-96 mb-6">
                <Image
                  src={workshop.image_url}
                  alt={workshop.title}
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{workshop.title}</h1>
            <p className="text-gray-600 mb-6">{workshop.description}</p>
            
            {/* リッチテキストの詳細説明を表示 */}
            {workshop.rich_description && (
              <div 
                className="prose prose-sm max-w-none mb-6 p-4 bg-gray-50 rounded-lg"
                dangerouslySetInnerHTML={{ __html: workshop.rich_description }}
              />
            )}
            
            <div className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold text-lg mb-4">開催情報</h3>
              <dl className="space-y-2">
                {workshop.event_date && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">開催日</dt>
                    <dd className="font-semibold">
                      {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </dd>
                  </div>
                )}
                {workshop.event_time && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">開始時刻</dt>
                    <dd className="font-semibold">{workshop.event_time}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">料金</dt>
                  <dd className="font-semibold">¥{workshop.price.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">所要時間</dt>
                  <dd>{workshop.duration}分</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">最大参加人数</dt>
                  <dd>{workshop.max_participants}名</dd>
                </div>
                {workshop.location && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">開催場所</dt>
                    <dd>{workshop.location}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-2xl font-bold mb-6">予約フォーム</h2>
            
            {/* 開催日時の確認表示 */}
            {workshop.event_date && workshop.event_time && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">予約日時:</span> 
                  {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} 
                  {workshop.event_time}〜
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  参加人数
                </label>
                <input
                  type="number"
                  min="1"
                  max={workshop.max_participants}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={booking.participants}
                  onChange={(e) => setBooking({ ...booking, participants: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  お名前
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={booking.name}
                  onChange={(e) => setBooking({ ...booking, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={booking.email}
                  onChange={(e) => setBooking({ ...booking, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話番号
                </label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={booking.phone}
                  onChange={(e) => setBooking({ ...booking, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    年齢 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="150"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={booking.age}
                    onChange={(e) => setBooking({ ...booking, age: e.target.value })}
                    placeholder="例: 25"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    性別 *
                  </label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    value={booking.gender}
                    onChange={(e) => setBooking({ ...booking, gender: e.target.value })}
                  >
                    <option value="">選択してください</option>
                    <option value="male">男性</option>
                    <option value="female">女性</option>
                    <option value="other">その他</option>
                    <option value="prefer_not_to_say">回答しない</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備考
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  value={booking.notes}
                  onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <div className="flex justify-between font-semibold">
                    <span>合計金額</span>
                    <span>¥{(workshop.price * booking.participants).toLocaleString()}</span>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-indigo-700 transition-colors"
                >
                  決済画面へ進む
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}