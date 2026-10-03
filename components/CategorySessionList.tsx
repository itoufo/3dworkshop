'use client'

import Link from 'next/link'
import { ArrowRight, Calendar, Clock, Users, Sparkles } from 'lucide-react'
import FamilyFriendlyBadge from '@/components/FamilyFriendlyBadge'
import { formatPrice } from '@/lib/price'
import { useBookableSessions, type BookableSessionInput } from '@/lib/use-bookable-sessions'

export interface CategorySession extends BookableSessionInput {
  event_date: string
  event_time: string | null
  is_family_friendly: boolean
  workshop_price: number
  workshop_max_participants: number
}

function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })
}

/** カテゴリページ右カラムの「予約可能な日程」（PC）。締切を過ぎた回は閲覧時に除く */
export default function CategorySessionList({ sessions }: { sessions: CategorySession[] }) {
  const upcomingSessions = useBookableSessions(sessions)

  return (
        <div className="bg-white rounded-2xl shadow-xl ring-2 ring-purple-200 overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white">
          <Calendar className="w-5 h-5 mr-2" />
          <h2 className="text-xl font-bold">予約可能な日程</h2>
        </div>
        {upcomingSessions.length > 0 && (
          <span className="bg-white text-purple-700 text-sm font-bold rounded-full px-3 py-0.5 flex-shrink-0">
            {upcomingSessions.length}件
          </span>
        )}
      </div>

      <div className="p-5">
        {upcomingSessions.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
            <Sparkles className="w-8 h-8 text-amber-600 mx-auto mb-2" />
            <p className="text-gray-900 font-medium text-sm mb-1">予約可能な日程はありません</p>
            <p className="text-gray-600 text-xs">下のフォームからリクエストを送ってください</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {upcomingSessions.map((s) => (
              <Link
                key={s.id}
                href={`/workshops/${s.workshop_id}`}
                className="group block bg-gradient-to-br from-white to-purple-50/40 rounded-xl p-4 border-2 border-purple-100 hover:border-purple-400 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-base font-bold text-gray-900 truncate">
                    {formatDateLong(s.event_date)}
                  </span>
                  <span className="text-base font-bold text-purple-700 flex-shrink-0">
                    {formatPrice(s.workshop_price)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-3 mb-3">
                  {s.event_time && (
                    <span className="inline-flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-purple-400" />
                      {s.event_time.slice(0, 5)}〜
                    </span>
                  )}
                  <span className="inline-flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-purple-400" />
                    最大{s.workshop_max_participants}名
                  </span>
                </div>
                {s.is_family_friendly && (
                  <div className="mb-3">
                    <FamilyFriendlyBadge />
                  </div>
                )}
                <span className="flex items-center justify-center w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm rounded-full py-2.5 shadow group-hover:shadow-md transition-all">
                  この日程を予約する
                  <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
