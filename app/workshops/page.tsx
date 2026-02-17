'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Workshop, WorkshopCategory } from '@/types'
import Header from '@/components/Header'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Clock, MapPin, Users, Sparkles, Pin, ChevronLeft, ChevronRight } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'

const ITEMS_PER_PAGE = 9

export default function WorkshopsPage() {
  const router = useRouter()
  const [allWorkshops, setAllWorkshops] = useState<Workshop[]>([])
  const [categories, setCategories] = useState<WorkshopCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [navigating, setNavigating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    async function fetchData() {
      // カテゴリを取得
      const { data: catsData } = await supabase
        .from('workshop_categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (catsData) setCategories(catsData)

      // 全WS取得（カテゴリJOIN）
      const { data, error } = await supabase
        .from('workshops')
        .select('*, category:workshop_categories(*)')
        .order('is_pinned', { ascending: false })
        .order('pin_order', { ascending: true })
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })

      if (error) {
        console.error('Error fetching workshops:', error)
      } else {
        setAllWorkshops(data as Workshop[])
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // カテゴリフィルタ適用
  const filteredByCategory = selectedCategory
    ? allWorkshops.filter(w => w.category_id === selectedCategory)
    : allWorkshops

  // 開催予定と過去に分割
  const upcomingWorkshops = filteredByCategory.filter(w => {
    if (!w.event_date) return true
    return new Date(w.event_date) >= today
  })

  const pastWorkshops = filteredByCategory.filter(w => {
    if (!w.event_date) return false
    return new Date(w.event_date) < today
  }).reverse()

  const handleWorkshopClick = (e: React.MouseEvent, workshopId: string) => {
    e.preventDefault()
    if (navigating) return
    setNavigating(workshopId)
    router.push(`/workshops/${workshopId}`)
  }

  // Pagination for upcoming workshops
  const totalPages = Math.ceil(upcomingWorkshops.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentWorkshops = upcomingWorkshops.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setCurrentPage(1)
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
                東京・湯島駅から徒歩1分
              </div>
            </div>
            <div className="flex justify-center mb-6">
              <Image
                src="/logo.png"
                alt="3DLab - 3Dプリンタ教室 東京・湯島"
                width={360}
                height={120}
                className="h-24 sm:h-32 md:h-40 w-auto"
                priority
                quality={90}
              />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              東京で3Dプリンタを体験しよう
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
              東京都文京区湯島にある3Dプリンタ教室。<br className="hidden sm:inline" />
              初心者から上級者まで、最新の3Dプリンターで創造的な体験を。
            </p>
            <p>
              湯島駅から徒歩1分、御徒町・秋葉原・御茶ノ水からも徒歩圏内。<br className="hidden sm:inline" />
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-3 py-1 bg-white/80 backdrop-blur text-sm text-gray-700 rounded-full border border-gray-200">
                📍 東京メトロ千代田線 湯島駅 徒歩1分
              </span>
              <span className="px-3 py-1 bg-white/80 backdrop-blur text-sm text-gray-700 rounded-full border border-gray-200">
                🚃 JR御徒町駅 徒歩8分
              </span>
              <span className="px-3 py-1 bg-white/80 backdrop-blur text-sm text-gray-700 rounded-full border border-gray-200">
                🚇 秋葉原駅 徒歩10分
              </span>
              <span className="px-3 py-1 bg-white/80 backdrop-blur text-sm text-gray-700 rounded-full border border-gray-200">
                🚉 御茶ノ水駅 徒歩12分
              </span>
            </div>

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

        {/* Category Filter Bar */}
        {categories.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => handleCategoryChange(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedCategory === null
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                全て
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    selectedCategory === cat.id
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Workshops Grid */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">開催予定</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>予約受付中</span>
            </div>
          </div>

          {upcomingWorkshops.length === 0 ? (
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
                      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                        <Image
                          src={optimizeImageUrl(workshop.image_url, 75)}
                          alt={`${workshop.title} - 3Dプリンタワークショップ 東京・湯島`}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4="
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <div className="w-20 h-20 bg-white/50 rounded-2xl flex items-center justify-center">
                          <span className="text-3xl font-bold text-purple-600">3D</span>
                        </div>
                      </div>
                    )}

                    {/* Category Badge */}
                    {workshop.category && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur text-purple-700 text-xs font-medium rounded-full">
                        {workshop.category.name}
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

          {/* Past Workshops Section */}
          {pastWorkshops.length > 0 && (
            <section className="mt-20">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">過去の開催</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {pastWorkshops.map((workshop) => (
                  <div
                    key={workshop.id}
                    onClick={(e) => handleWorkshopClick(e, workshop.id)}
                    className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden opacity-75 hover:opacity-100 cursor-pointer ${
                      navigating === workshop.id ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="relative">
                      {workshop.image_url ? (
                        <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                          <Image
                            src={optimizeImageUrl(workshop.image_url, 75)}
                            alt={`${workshop.title} - 3Dプリンタワークショップ`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className="text-3xl font-bold text-gray-400">3D</span>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 px-3 py-1 bg-gray-700 text-white text-xs font-medium rounded-full">
                        終了
                      </div>
                      {workshop.category && (
                        <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur text-gray-600 text-xs font-medium rounded-full">
                          {workshop.category.name}
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{workshop.title}</h3>
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{workshop.description}</p>
                      {workshop.event_date && (
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                            year: 'numeric', month: 'long', day: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* Access Section */}
        <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
              アクセス
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Map */}
              <div className="rounded-2xl overflow-hidden shadow-lg h-96">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.0302599999997!2d139.7671258!3d35.7051736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188ea6490c7a0b%3A0xf7e6918f7f01c837!2z5qCq5byP5Lya56S-44Km44Kp44O844Kr44O8!5e0!3m2!1sja!2sjp!4v1736922000000!5m2!1sja!2sjp"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen={true}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="3DLabの地図"
                />
              </div>

              {/* Access Info */}
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl">
                  <h3 className="font-bold text-lg mb-4 text-gray-900">📍 3DLab</h3>
                  <address className="not-italic space-y-2 text-gray-700">
                    <p className="font-medium">
                      〒113-0034
                    </p>
                    <p className="text-lg">
                      東京都文京区湯島3-14-8<br />
                      加田湯島ビル 5F
                    </p>
                  </address>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900">電車でのアクセス</h4>
                  <div className="grid gap-2">
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">🚇</span>
                      <div>
                        <p className="font-medium text-gray-900">東京メトロ千代田線 湯島駅</p>
                        <p className="text-sm text-gray-600">3番出口から徒歩1分</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">🚃</span>
                      <div>
                        <p className="font-medium text-gray-900">JR山手線・京浜東北線 御徒町駅</p>
                        <p className="text-sm text-gray-600">南口から徒歩8分</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">🚇</span>
                      <div>
                        <p className="font-medium text-gray-900">JR総武線・日比谷線 秋葉原駅</p>
                        <p className="text-sm text-gray-600">電気街口から徒歩10分</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <span className="text-2xl">🚉</span>
                      <div>
                        <p className="font-medium text-gray-900">丸ノ内線 御茶ノ水駅</p>
                        <p className="text-sm text-gray-600">聖橋口から徒歩12分</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="bg-gradient-to-b from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                東京・秋葉原エリアで3Dプリンター体験なら3DLab
              </h2>

              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  <strong>3DLab（スリーディーラボ）</strong>は、東京都文京区湯島にある3Dプリンター専門の体験教室です。
                  東京メトロ千代田線の湯島駅から徒歩1分、JR御徒町駅から徒歩8分、秋葉原駅から徒歩10分と、
                  アクセス抜群の立地で、お仕事帰りや休日に気軽に3Dプリンティング技術を学ぶことができます。
                </p>

                <p>
                  初心者向けの<strong>3Dプリンター体験ワークショップ</strong>から、本格的な3Dモデリング技術を習得できる
                  <strong>スクールコース</strong>まで、幅広いプログラムをご用意。
                  最新の3Dプリンター機材を使用し、実践的なスキルを身につけることができます。
                </p>

                <p>
                  東京・秋葉原エリアで3Dプリンターに興味がある方、プロトタイプ制作や企業研修をお考えの方は、
                  ぜひ3DLabの体験イベントにご参加ください。湯島・御徒町・御茶ノ水からもアクセス便利です。
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">最寄駅</p>
                  <p className="font-bold text-purple-600">湯島駅 徒歩1分</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">対象</p>
                  <p className="font-bold text-purple-600">初心者〜上級者</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">体験時間</p>
                  <p className="font-bold text-purple-600">60分〜</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-600">営業時間</p>
                  <p className="font-bold text-purple-600">10:00〜20:00</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">3D</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">3Dプリンタ教室 3DLab</h3>
              <p className="text-sm text-gray-400">
                東京都文京区湯島3-14-8 加田湯島ビル 5F
              </p>
              <p className="text-sm text-gray-400">
                湯島駅・御徒町駅・秋葉原駅・御茶ノ水駅 からアクセス可能
              </p>
            </div>

            {/* Contact Information */}
            <div className="border-t border-gray-800 pt-6 mb-6">
              <div className="text-center space-y-2">
                <p className="text-sm">
                  <span className="text-gray-400">お問い合わせ：</span>
                  <a href="mailto:y-sato@sunu25.com" className="text-purple-400 hover:text-purple-300 ml-2">
                    y-sato@sunu25.com
                  </a>
                </p>
                <p className="text-sm">
                  <span className="text-gray-400">電話：</span>
                  <a href="tel:080-9453-0911" className="text-purple-400 hover:text-purple-300 ml-2">
                    080-9453-0911
                  </a>
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-6 mb-6">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">運営会社</p>
                <div className="flex justify-center items-center space-x-4 flex-wrap">
                  <a href="https://sunu25.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                    株式会社sunu
                  </a>
                  <span className="text-gray-600">|</span>
                  <a href="https://walker.co.jp" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                    株式会社ウォーカー
                  </a>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                © 2024 3DLab - 3Dプリンタ 東京 | 湯島・御徒町・秋葉原・御茶ノ水からアクセス
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
