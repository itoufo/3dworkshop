'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { jstToday, sessionStartJst } from '@/lib/booking-deadline'
import { formatPrice } from '@/lib/price'
import FamilyFriendlyBadge from '@/components/FamilyFriendlyBadge'
import { enWeekday, type Locale } from '@/lib/i18n'

export type CalendarEntry = {
  workshopId: string
  title: string
  date: string // YYYY-MM-DD（JST）
  time: string | null // HH:MM
  price: number
  familyFriendly: boolean
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TEXT = {
  ja: { prev: '前の週', next: '次の週', thisWeek: '今日から1週間', count: (n: number) => `${n}回`, today: '今日', none: '開催なし', noTime: '時間未定', basePath: '/workshops' },
  en: { prev: 'Previous week', next: 'Next week', thisWeek: 'The next 7 days', count: (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`, today: 'Today', none: 'No sessions', noTime: 'Time TBA', basePath: '/en/workshops' },
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function formatDay(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${m}/${d}`
}

function weekdayClass(wd: number): string {
  if (wd === 0) return 'text-red-600'
  if (wd === 6) return 'text-blue-600'
  return 'text-gray-700'
}

export default function WeeklyCalendarClient({
  entries,
  serverToday,
  maxWeeks,
  locale = 'ja',
}: {
  entries: CalendarEntry[]
  serverToday: string
  maxWeeks: number
  locale?: Locale
}) {
  const t = TEXT[locale]
  const wdLabels = locale === 'en' ? EN_WEEKDAYS : WEEKDAYS
  // ⚠ 初回描画はサーバーの「今日」で揃える（ハイドレーションの不一致を避ける）。
  //   ページは最大1時間キャッシュされるので、表示後にブラウザの時計で今日と現在時刻を取り直す
  const [today, setToday] = useState(serverToday)
  const [now, setNow] = useState<number | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    setToday(jstToday())
    setNow(Date.now())
  }, [])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDate(today, weekOffset * 7 + i)),
    [today, weekOffset],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>()
    for (const e of entries) {
      // 開始済みの回は出さない（予約できないため）
      if (now !== null && sessionStartJst({ event_date: e.date, event_time: e.time }).getTime() <= now) continue
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return map
  }, [entries, now])

  const weekCount = days.reduce((n, d) => n + (byDay.get(d)?.length ?? 0), 0)
  const rangeLabel =
    locale === 'en'
      ? `${enWeekday(days[0])} ${formatDay(days[0])} – ${enWeekday(days[6])} ${formatDay(days[6])}`
      : `${formatDay(days[0])}（${WEEKDAYS[weekdayOf(days[0])]}）〜 ${formatDay(days[6])}（${WEEKDAYS[weekdayOf(days[6])]}）`

  return (
    <div>
      {/* 週の切り替え */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset === 0}
          className="inline-flex items-center px-3 py-2 rounded-full border border-purple-200 text-purple-700 text-base font-medium hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t.prev}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">{t.prev}</span>
        </button>
        <p className="text-base sm:text-lg font-semibold text-gray-900 text-center" aria-live="polite">
          {weekOffset === 0 ? t.thisWeek : rangeLabel}
          <span className="block sm:inline sm:ml-2 text-base font-normal text-gray-600">
            {weekOffset === 0 && <span className="mr-2">{rangeLabel}</span>}
            {t.count(weekCount)}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.min(maxWeeks - 1, w + 1))}
          disabled={weekOffset >= maxWeeks - 1}
          className="inline-flex items-center px-3 py-2 rounded-full border border-purple-200 text-purple-700 text-base font-medium hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={t.next}
        >
          <span className="hidden sm:inline">{t.next}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* PC: 7列の時系列 / スマホ: 日ごとに縦に並べる */}
      <ol className="grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-3">
        {days.map((date) => {
          const wd = weekdayOf(date)
          const list = byDay.get(date) ?? []
          const isToday = date === today
          return (
            <li
              key={date}
              className={`rounded-2xl border ${isToday ? 'border-purple-400 bg-purple-50/60' : 'border-gray-200 bg-gray-50'} p-3 flex md:block gap-3 md:min-h-[12rem]`}
            >
              {/* スマホは日付の下に曜日を置く（横に並べると内容の列に食い込む） */}
              <div className="flex flex-col items-center md:block md:mb-3 w-14 md:w-auto flex-shrink-0">
                <span className={`text-lg font-bold ${weekdayClass(wd)}`}>{formatDay(date)}</span>
                <span className={`text-base font-medium ${weekdayClass(wd)} md:ml-1`}>
                  <span className="md:hidden">{wdLabels[wd]}</span>
                  <span className="hidden md:inline">{locale === 'en' ? ` ${wdLabels[wd]}` : `（${wdLabels[wd]}）`}</span>
                </span>
                {isToday && (
                  <span className="md:hidden mt-1 px-2 py-0.5 rounded-full bg-purple-600 text-white text-sm font-bold">{t.today}</span>
                )}
                {isToday && (
                  <span className="hidden md:inline-block ml-1 px-2 py-0.5 rounded-full bg-purple-600 text-white text-sm font-bold align-middle">
                    {t.today}
                  </span>
                )}
              </div>
              {list.length === 0 ? (
                <p className="text-base text-gray-400 self-center">{t.none}</p>
              ) : (
                <ul className="flex-1 space-y-2">
                  {list.map((e) => (
                    <li key={`${e.workshopId}-${e.date}-${e.time}`}>
                      <Link
                        href={`${t.basePath}/${e.workshopId}`}
                        className="block rounded-xl bg-white border border-purple-100 p-3 hover:border-purple-400 hover:shadow-md transition-all"
                      >
                        <span className="flex items-center text-base font-bold text-purple-700">
                          <Clock className="w-4 h-4 mr-1" aria-hidden />
                          {e.time ?? t.noTime}
                        </span>
                        <span className="block mt-1 text-base font-medium text-gray-900 leading-snug line-clamp-3">
                          {e.title}
                        </span>
                        <span className="block mt-1 text-base text-gray-600">{formatPrice(e.price)}</span>
                        {e.familyFriendly && (
                          <FamilyFriendlyBadge size="sm" className="mt-2" label={locale === 'en' ? 'Recommended for families' : undefined} />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
