import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'

async function getWorkshops() {
  const { data, error } = await supabase
    .from('workshops')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching workshops:', error)
    return []
  }

  return data as Workshop[]
}

export default async function Home() {
  const workshops = await getWorkshops()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">ワークショップ予約</h1>
            <Link
              href="/admin"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              管理画面
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">開催予定のワークショップ</h2>
        
        {workshops.length === 0 ? (
          <p className="text-gray-600">現在、予約可能なワークショップはありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop) => (
              <Link
                key={workshop.id}
                href={`/workshops/${workshop.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                {workshop.image_url && (
                  <div className="relative w-full h-48">
                    <Image
                      src={workshop.image_url}
                      alt={workshop.title}
                      fill
                      className="object-cover rounded-t-lg"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {workshop.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {workshop.description}
                  </p>
                  {/* 開催日時の表示 */}
                  {(workshop.event_date || workshop.event_time) && (
                    <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      {workshop.event_date && (
                        <div className="text-lg font-bold text-indigo-900 mb-1">
                          📅 {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit'
                          }).replace(/\//g, '/')}
                        </div>
                      )}
                      {workshop.event_time && (
                        <div className="text-lg font-semibold text-indigo-700">
                          🕰️ {workshop.event_time.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-indigo-600">
                      ¥{workshop.price.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {workshop.duration}分
                    </span>
                  </div>
                  <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                    <span>最大{workshop.max_participants}名</span>
                    {workshop.location && (
                      <span>📍 {workshop.location}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}