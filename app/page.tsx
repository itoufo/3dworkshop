'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workshop } from '@/types'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Clock, MapPin, Users, Sparkles, Pin, ChevronLeft, ChevronRight } from 'lucide-react'

const ITEMS_PER_PAGE = 9

export default function Home() {
  const router = useRouter()
  const [filteredWorkshops, setFilteredWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function fetchWorkshops() {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data, error } = await supabase
        .from('workshops')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('pin_order', { ascending: true })
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })

      if (error) {
        console.error('Error fetching workshops:', error)
      } else {
        const allWorkshops = data as Workshop[]
        
        const futureWorkshops = allWorkshops.filter(workshop => {
          if (!workshop.event_date) return true
          const workshopDate = new Date(workshop.event_date)
          return workshopDate >= today
        })
        
        setFilteredWorkshops(futureWorkshops)
      }
      setLoading(false)
    }

    fetchWorkshops()
  }, [])

  const handleWorkshopClick = (e: React.MouseEvent, workshopId: string) => {
    e.preventDefault()
    
    // 既に遷移中の場合は何もしない
    if (navigating) return
    
    setNavigating(workshopId)
    router.push(`/workshops/${workshopId}`)
  }

  const totalPages = Math.ceil(filteredWorkshops.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentWorkshops = filteredWorkshops.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <>
      {navigating && <LoadingOverlay message="ワークショップ詳細を読み込んでいます..." />}
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
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-gray-900">
              3Dプリンタ教室
            </span>
            <br />
            <span className="text-gray-900">
              3DLab
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            3DLabで学ぶ、創造性を形にする体験。
            最新の3Dプリンターを使って、あなたのアイデアを現実に。
          </p>
          
          {/* スクール募集バナー */}
          <div className="mt-8">
            <a
              href="/school"
              className="inline-block bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold">🎉 スクール生募集中！</span>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">第1期生 限定特典あり</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Workshops Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">開催予定</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>予約受付中</span>
          </div>
        </div>
        
        {filteredWorkshops.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">現在、予約可能なワークショップはありません</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {currentWorkshops.map((workshop) => (
              <div
                key={workshop.id}
                onClick={(e) => handleWorkshopClick(e, workshop.id)}
                className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 cursor-pointer ${
                  navigating === workshop.id ? 'opacity-75 pointer-events-none' : ''
                }`}
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
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 flex items-center">
                    {workshop.title}
                    {workshop.is_pinned && (
                      <Pin className="w-5 h-5 ml-2 text-orange-500 fill-orange-500 flex-shrink-0" />
                    )}
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
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="前のページ"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2 text-gray-400">
                        ...
                      </span>
                    )
                  }
                  return null
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="次のページ"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
          </>
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
    </>
  )
}