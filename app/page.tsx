import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import Header from '@/components/Header'
import { Calendar, Clock, MapPin, Users, Sparkles } from 'lucide-react'

// キャッシュを無効化してリアルタイムデータを取得
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getWorkshops() {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workshops:', error)
    return []
  }

  console.log('Homepage workshops:', data)
  return data as Workshop[]
}

export default async function Home() {
  const workshops = await getWorkshops()

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              <Sparkles className="w-4 h-4 mr-2" />
              クリエイティブな体験を
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              3Dプリンティング
            </span>
            <br />
            ワークショップ
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            初心者から上級者まで、創造性を形にする体験を。
            最新の3Dプリンターを使って、あなたのアイデアを現実に。
          </p>
        </div>
      </section>

      {/* Workshops Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">開催予定</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>予約受付中</span>
          </div>
        </div>
        
        {workshops.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">現在、予約可能なワークショップはありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workshops.map((workshop) => (
              <Link
                key={workshop.id}
                href={`/workshops/${workshop.id}`}
                className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
              >
                {/* Image Section */}
                {workshop.image_url ? (
                  <div className="relative w-full h-56 overflow-hidden">
                    <Image
                      src={workshop.image_url}
                      alt={workshop.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    <div className="w-20 h-20 bg-white/50 rounded-2xl flex items-center justify-center">
                      <span className="text-3xl font-bold text-purple-600">3D</span>
                    </div>
                  </div>
                )}

                {/* Content Section */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                    {workshop.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {workshop.description}
                  </p>

                  {/* Date and Time */}
                  {(workshop.event_date || workshop.event_time) && (
                    <div className="space-y-2 mb-4">
                      {workshop.event_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                          {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </div>
                      )}
                      {workshop.event_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2 text-purple-500" />
                          {workshop.event_time.slice(0, 5)} 〜（{workshop.duration}分）
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {workshop.location && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-1 text-purple-500" />
                        <span className="truncate">{workshop.location}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-1 text-purple-500" />
                      最大{workshop.max_participants}名
                    </div>
                  </div>

                  {/* Price and Action */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-sm text-gray-500">参加費</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ¥{workshop.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium group-hover:shadow-lg transition-all duration-300">
                      詳細を見る
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                {workshop.max_participants <= 3 && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                    残りわずか
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">3D</span>
            </div>
          </div>
          <p className="text-sm">© 2024 3D Workshop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}