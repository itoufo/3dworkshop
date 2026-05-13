'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Workshop, WorkshopCategory } from '@/types'
import LoadingOverlay from '@/components/LoadingOverlay'
import { Calendar, Clock, MapPin, Users, Pin, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { useRouter } from 'next/navigation'
import PastWorkshopsAccordion from '@/components/PastWorkshopsAccordion'

const ITEMS_PER_PAGE = 9

interface WorkshopListClientProps {
  workshops: Workshop[]
  categories: WorkshopCategory[]
}

function todayIsoString(): string {
  const d = new Date()
  // ローカル時刻ベースで YYYY-MM-DD を作る (タイムゾーン依存を避ける)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getUpcomingSessions(w: Workshop, today: string) {
  return (w.sessions ?? []).filter(s => s.status === 'scheduled' && s.event_date >= today)
}

function formatDateShort(iso: string): string {
  // 'YYYY-MM-DD' -> 'M/D(曜)'
  const [, m, d] = iso.split('-').map(Number)
  const date = new Date(Number(iso.slice(0, 4)), m - 1, d)
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${m}/${d}(${weekday})`
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

export default function WorkshopListClient({ workshops, categories }: WorkshopListClientProps) {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null) // 'YYYY-MM-DD' | 'request' | null
  const [navigating, setNavigating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const todayIso = todayIsoString()

  const filteredByCategory = useMemo(
    () =>
      selectedCategory
        ? workshops.filter(w => w.category_id === selectedCategory)
        : workshops,
    [workshops, selectedCategory]
  )

  // 日付ピル候補: カテゴリで絞り込んだ workshops の upcoming sessions から
  const dateOptions = useMemo(() => {
    const dates = new Set<string>()
    let hasRequestable = false
    for (const w of filteredByCategory) {
      const upcoming = getUpcomingSessions(w, todayIso)
      if (upcoming.length === 0) {
        hasRequestable = true
      } else {
        upcoming.forEach(s => dates.add(s.event_date))
      }
    }
    return {
      dates: Array.from(dates).sort(),
      hasRequestable,
    }
  }, [filteredByCategory, todayIso])

  // 日付フィルタ適用
  const filteredByDate = useMemo(() => {
    if (selectedDate === null) {
      // 全て = upcoming session を持つもの + 開催未定（リクエスト枠）の両方
      return filteredByCategory.filter(w => {
        const upcoming = getUpcomingSessions(w, todayIso)
        return upcoming.length > 0 || (w.sessions ?? []).length === 0
      })
    }
    if (selectedDate === 'request') {
      return filteredByCategory.filter(w => (w.sessions ?? []).length === 0)
    }
    return filteredByCategory.filter(w =>
      getUpcomingSessions(w, todayIso).some(s => s.event_date === selectedDate)
    )
  }, [filteredByCategory, selectedDate, todayIso])

  // 過去ワークショップ (全 session が過去 = upcoming 0件 かつ sessions 1件以上)
  const pastWorkshops = useMemo(() => {
    return filteredByCategory
      .filter(w => {
        const sessions = w.sessions ?? []
        if (sessions.length === 0) return false
        return getUpcomingSessions(w, todayIso).length === 0
      })
      .reverse()
  }, [filteredByCategory, todayIso])

  const handleWorkshopClick = (e: React.MouseEvent, workshopId: string) => {
    e.preventDefault()
    if (navigating) return
    setNavigating(workshopId)
    router.push(`/workshops/${workshopId}`)
  }

  const totalPages = Math.ceil(filteredByDate.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentWorkshops = filteredByDate.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setSelectedDate(null)
    setCurrentPage(1)
  }

  const handleDateChange = (date: string | null) => {
    setSelectedDate(date)
    setCurrentPage(1)
  }

  return (
    <>
      {navigating && <LoadingOverlay message="ワークショップ詳細を読み込んでいます..." />}

      {/* Category Filter Bar */}
      {categories.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
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

      {/* Date Pill Bar */}
      {(dateOptions.dates.length > 0 || dateOptions.hasRequestable) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleDateChange(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                selectedDate === null
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              全日程
            </button>
            {dateOptions.dates.map(d => (
              <button
                key={d}
                onClick={() => handleDateChange(d)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  selectedDate === d
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {formatDateShort(d)}
              </button>
            ))}
            {dateOptions.hasRequestable && (
              <button
                onClick={() => handleDateChange('request')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                  selectedDate === 'request'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                開催未定 (リクエスト)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Workshops Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 space-y-4 sm:space-y-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {selectedDate === 'request' ? '開催リクエスト受付中' : '開催予定'}
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span>予約受付中</span>
          </div>
        </div>

        {filteredByDate.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">
              {selectedDate ? '該当するワークショップはありません' : '現在、予約可能なワークショップはありません'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {currentWorkshops.map((workshop) => {
                const upcoming = getUpcomingSessions(workshop, todayIso)
                const nearest = upcoming[0]
                const isRequestOnly = (workshop.sessions ?? []).length === 0
                const additionalCount = Math.max(0, upcoming.length - 1)
                return (
                  <div
                    key={workshop.id}
                    onClick={(e) => handleWorkshopClick(e, workshop.id)}
                    className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 cursor-pointer ${
                      navigating === workshop.id ? 'opacity-75 pointer-events-none' : ''
                    }`}
                  >
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

                    {workshop.category && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur text-purple-700 text-xs font-medium rounded-full">
                        {workshop.category.name}
                      </div>
                    )}

                    {isRequestOnly && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full shadow">
                        開催リクエスト受付中
                      </div>
                    )}

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

                      {nearest ? (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                            {formatDateLong(nearest.event_date)}
                            {additionalCount > 0 && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                                他{additionalCount}日程
                              </span>
                            )}
                          </div>
                          {nearest.event_time && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2 text-purple-500" />
                              {nearest.event_time.slice(0, 5)} 〜{workshop.duration ? `（${workshop.duration}分）` : ''}
                            </div>
                          )}
                        </div>
                      ) : isRequestOnly ? (
                        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                          開催日程は未定です。リクエストで日程相談できます
                        </div>
                      ) : null}

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

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-sm text-gray-500">参加費</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ¥{workshop.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium group-hover:shadow-lg transition-all duration-300">
                          {isRequestOnly ? 'リクエストする' : '詳細を見る'}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
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
        <PastWorkshopsAccordion workshops={pastWorkshops} showCategory />
      </main>
    </>
  )
}
