import { CalendarDays } from 'lucide-react'
import { getAllWorkshops } from '@/lib/workshops'
import { jstToday } from '@/lib/booking-deadline'
import WeeklyCalendarClient, { type CalendarEntry } from '@/components/WeeklyCalendarClient'

/** 何週先まで送れるか。それより先の日程は一覧（/workshops）で見る */
const MAX_WEEKS = 8

/**
 * 1週間ぶんの開催日程を、日ごと・時刻順に並べるカレンダー。トップと /workshops に置く。
 *
 * 日程の抽出はサーバー（ISR）で行い、週の起点（今日）と開始済みの回の除外はブラウザで行う。
 * ⚠ ページは1時間キャッシュされるので、サーバーで決めた「今日」は最大1時間古い。
 *   日付をまたいだ直後に昨日の回が残らないよう、表示側でもう一度今日を取り直す
 */
export default async function WeeklyWorkshopCalendar({ headingLevel = 'h2' }: { headingLevel?: 'h2' | 'h3' }) {
  const workshops = await getAllWorkshops()
  const today = jstToday()

  const entries: CalendarEntry[] = workshops
    .flatMap((w) =>
      (w.sessions ?? [])
        // 昨日の分も渡しておく（キャッシュが日付をまたいだときに、ブラウザ側で今日を起点に切り直せるように）
        .filter((s) => s.status === 'scheduled' && s.event_date >= shiftDate(today, -1))
        .map((s) => ({
          workshopId: w.id,
          title: w.title,
          date: s.event_date,
          time: s.event_time ? s.event_time.slice(0, 5) : null,
          price: w.price,
          familyFriendly: Boolean(s.is_family_friendly),
        })),
    )
    .filter((e) => e.date <= shiftDate(today, MAX_WEEKS * 7))
    .sort((a, b) => (a.date + (a.time ?? '99:99')).localeCompare(b.date + (b.time ?? '99:99')))

  const Heading = headingLevel

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white" aria-labelledby="weekly-calendar-heading">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className="w-7 h-7 text-purple-600" aria-hidden />
          <Heading id="weekly-calendar-heading" className="text-3xl md:text-4xl font-bold text-gray-900">
            1週間の開催スケジュール
          </Heading>
        </div>
        <WeeklyCalendarClient entries={entries} serverToday={today} maxWeeks={MAX_WEEKS} />
      </div>
    </section>
  )
}

function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
