'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Calendar, Clock, Users, ArrowRight, Sparkles, X } from 'lucide-react'
import WorkshopRequestForm from '@/components/WorkshopRequestForm'

interface SessionRef {
  id: string
  event_date: string
  event_time: string | null
  workshop_id: string
  workshop_price: number
  workshop_max_participants: number
}

interface Props {
  categorySlug: string
  upcomingSessions: SessionRef[]
}

function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })
}

export default function MobileCategoryFloatingCta({ categorySlug, upcomingSessions }: Props) {
  const [open, setOpen] = useState(false)

  // body scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  const hasUpcoming = upcomingSessions.length > 0
  const nearest = upcomingSessions[0]

  return (
    <>
      {/* Floating Bottom CTA — モバイルのみ */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-3 safe-bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full py-3 px-5 font-bold shadow-lg flex items-center justify-between active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center min-w-0">
            <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />
            <span className="truncate text-sm">
              {hasUpcoming
                ? `予約 (${upcomingSessions.length}日程)`
                : '開催リクエスト'}
            </span>
          </span>
          {nearest && (
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 ml-2 flex-shrink-0">
              次回 {new Date(`${nearest.event_date}T00:00:00`).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
            </span>
          )}
        </button>
      </div>

      {/* Bottom Sheet Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpen(false)}
        />

        {/* Sheet */}
        <div
          className={`absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${
            open ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ maxHeight: '90vh' }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: 'calc(90vh - 24px)' }}>
            {/* 予約可能な日程 */}
            {hasUpcoming && (
              <section className="mb-6">
                <div className="flex items-center mb-3 pt-2">
                  <Calendar className="w-5 h-5 mr-2 text-purple-600" />
                  <h2 className="text-lg font-bold text-gray-900">予約可能な日程</h2>
                </div>
                <div className="space-y-2">
                  {upcomingSessions.map((s) => (
                    <Link
                      key={s.id}
                      href={`/workshops/${s.workshop_id}`}
                      onClick={() => setOpen(false)}
                      className="group block bg-gradient-to-br from-white to-purple-50/30 rounded-xl p-3 border border-gray-100 hover:border-purple-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center text-sm font-bold text-gray-900 min-w-0">
                          <Calendar className="w-4 h-4 mr-1.5 text-purple-500 flex-shrink-0" />
                          <span className="truncate">{formatDateLong(s.event_date)}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900 flex-shrink-0">
                          ¥{s.workshop_price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-gray-600 ml-5 flex items-center gap-2 min-w-0">
                          {s.event_time && (
                            <span className="inline-flex items-center">
                              <Clock className="w-3 h-3 mr-0.5 text-purple-400" />
                              {s.event_time.slice(0, 5)}〜
                            </span>
                          )}
                          <span className="inline-flex items-center">
                            <Users className="w-3 h-3 mr-0.5 text-purple-400" />
                            最大{s.workshop_max_participants}名
                          </span>
                        </div>
                        <span className="text-xs font-medium text-purple-600 group-hover:text-purple-700 flex items-center flex-shrink-0">
                          予約
                          <ArrowRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* リクエストフォーム */}
            <section className={hasUpcoming ? 'border-t border-gray-200 pt-6' : 'pt-2'}>
              <div className="flex items-center mb-2">
                <Sparkles className="w-5 h-5 mr-2 text-amber-500" />
                <h2 className="text-lg font-bold text-gray-900">
                  {hasUpcoming ? '希望の日程をリクエスト' : '開催をリクエスト'}
                </h2>
              </div>
              <p className="text-xs text-gray-600 mb-4">
                {hasUpcoming
                  ? '日程が合わない方はご希望をお送りください。'
                  : 'ご希望の日程や条件をお送りください。開催可能になりましたらメールでお知らせします。'}
              </p>
              <WorkshopRequestForm categorySlug={categorySlug} />
            </section>
          </div>
        </div>
      </div>

      {/* スペーサー: floating CTAの高さ分のマージンを下部に確保 */}
      <div className="lg:hidden h-20" aria-hidden="true" />
    </>
  )
}
