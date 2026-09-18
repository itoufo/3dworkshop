import Link from 'next/link'
import Image from 'next/image'
import { Calendar, ArrowRight, CalendarClock, Sparkles } from 'lucide-react'
import {
  getAllWorkshops,
  getWorkshopActivityStats,
  getUpcomingSessions,
} from '@/lib/workshops'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { formatPrice } from '@/lib/price'
import FamilyFriendlyBadge from '@/components/FamilyFriendlyBadge'
import { StructuredData, WorkshopEventSchema } from '@/components/StructuredData'
import type { Workshop, WorkshopSession } from '@/types'

/** トップに出す開催予定の件数。全日程は /workshops の仕事なので、ここは頭出しだけ */
const UPCOMING_LIMIT = 3

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日(${wd})`
}

/** '11:00:00' → '11:00' */
function formatTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null
}

type UpcomingEntry = { workshop: Workshop; session: WorkshopSession }
/**
 * 同じ回を1行にまとめた表示単位。
 * 3DLab は「同じタイトルのワークショップを、日時ごとに別レコードで作る」運用なので、
 * session をそのまま並べると同じ日の 11:00 の回と 14:00 の回が同じ行に見えてしまう。
 * 日付＋タイトルでまとめ、開始時刻を併記して区別する。
 */
type UpcomingGroup = { key: string; date: string; times: string[]; entries: UpcomingEntry[] }
type CategoryEntry = { name: string; slug: string; upcomingCount: number }

/**
 * トップページの「ワークショップを開催しています」セクション。
 *
 * 目的は2つ。
 * 1. トップに「3Dプリンターのワークショップを継続的に開催している」と読める本文を置く
 *    （従来はボタン文言とカード見出しにしか "ワークショップ" が無かった）
 * 2. カテゴリピラーページ (/workshops/category/[slug]) へトップから内部リンクを張る。
 *    ワークショップ詳細の canonical はピラーに向いている（app/workshops/[id]/layout.tsx）のに、
 *    サイト最強のトップからピラーへのリンクが1本も無かった
 *
 * 開催予定が0件でも null を返さない。このセクションは、ページ唯一の
 * 「ワークショップをやっている」という記述だからである。
 */
export default async function WorkshopActivitySection() {
  const [workshops, stats] = await Promise.all([
    getAllWorkshops(),
    getWorkshopActivityStats(),
  ])

  // 直近の開催予定。workshop 単位ではなく session 単位で日付順に並べる。
  // getAllWorkshops() は cache() 済みで配列を共有するため、コピーしてから並べ替える。
  const upcomingEntries: UpcomingEntry[] = workshops
    .flatMap((w) => getUpcomingSessions(w).map((session) => ({ workshop: w, session })))
    .sort((a, b) => {
      if (a.session.event_date !== b.session.event_date) {
        return a.session.event_date.localeCompare(b.session.event_date)
      }
      return (a.session.event_time || '').localeCompare(b.session.event_time || '')
    })

  const groupMap = new Map<string, UpcomingGroup>()
  for (const entry of upcomingEntries) {
    const key = `${entry.session.event_date}__${entry.workshop.title}`
    const group = groupMap.get(key) ?? {
      key,
      date: entry.session.event_date,
      times: [],
      entries: [],
    }
    const time = formatTime(entry.session.event_time)
    if (time && !group.times.includes(time)) group.times.push(time)
    group.entries.push(entry)
    groupMap.set(key, group)
  }
  const upcoming = [...groupMap.values()].slice(0, UPCOMING_LIMIT)
  // 画面に出した行に含まれる session だけを構造化データにする
  const markedUpSessions = upcoming.flatMap((g) => g.entries)

  // カテゴリは埋め込みリレーションから拾う。workshop が1件も無いカテゴリは
  // リンク先が空になるので出さない。開催予定0のカテゴリは canonical 先なので隠さない。
  const categoryMap = new Map<string, CategoryEntry>()
  for (const w of workshops) {
    const c = w.category
    if (!c?.slug) continue
    const entry = categoryMap.get(c.slug) ?? { name: c.name, slug: c.slug, upcomingCount: 0 }
    if (getUpcomingSessions(w).length > 0) entry.upcomingCount += 1
    categoryMap.set(c.slug, entry)
  }
  const categories = [...categoryMap.values()].sort(
    (a, b) => b.upcomingCount - a.upcomingCount || a.name.localeCompare(b.name, 'ja')
  )

  const firstHeldLabel = stats.firstHeldDate
    ? `${Number(stats.firstHeldDate.slice(0, 4))}年${Number(stats.firstHeldDate.slice(5, 7))}月`
    : null

  return (
    <section className="border-y border-purple-100 bg-white py-16 px-4 sm:px-6 lg:px-8">
      {/* 画面に出している開催予定だけを Event として宣言する */}
      {upcoming.length > 0 && (
        <StructuredData
          data={{
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: '3DLab の開催予定ワークショップ',
            itemListElement: markedUpSessions.map(({ workshop, session }, i) => {
              const event = WorkshopEventSchema({
                ...workshop,
                event_date: session.event_date,
                event_time: session.event_time,
              }) as Record<string, unknown>
              // 入れ子の item では @context を持たない（外側の ItemList が持つ）
              delete event['@context']
              return { '@type': 'ListItem', position: i + 1, item: event }
            }),
          }}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
          {/* 主張 */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-2 text-sm font-semibold text-purple-700">
              <Sparkles className="w-4 h-4" />
              ワークショップ開催中
            </span>
            <h2 className="mt-5 text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              東京・湯島で、3Dプリンターの
              <br className="hidden sm:inline" />
              ワークショップを開催しています
            </h2>
            <div className="mt-6 space-y-4 text-base sm:text-lg text-gray-600 leading-relaxed">
              <p>
                3DLab（スリーディーラボ）は、東京メトロ千代田線 湯島駅から徒歩1分の教室で、
                3Dプリンターの体験ワークショップを開いています。
                AIで作ったオリジナルフィギュアの造形、NFCを埋め込んだ作品づくりなど、
                {stats.heldDays > 0 && firstHeldLabel ? (
                  <>
                    テーマを変えながら、{firstHeldLabel}の初回から
                    <strong className="text-purple-700">{stats.heldDays}日程・延べ{stats.participants}名</strong>
                    の方にご参加いただきました。
                  </>
                ) : (
                  <>テーマを変えながら定期的に開催しています。</>
                )}
              </p>
              <p>
                道具もデータも要りません。はじめての方が手ぶらで来て、その日のうちに自分の作品を持ち帰れます。
                小学生のお子さまと保護者の方が一緒に参加できる回もあります。
              </p>
              <p>
                御徒町駅から徒歩8分、秋葉原駅から徒歩10分、御茶ノ水駅から徒歩12分。
              </p>
            </div>
          </div>

          {/* 証拠（実際の日程） */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">直近の開催予定</h3>

            {upcoming.length > 0 ? (
              <ul className="mt-5 space-y-3">
                {upcoming.map((group) => {
                  const { workshop } = group.entries[0]
                  const isFamily = group.entries.some((e) => e.session.is_family_friendly)
                  return (
                    <li key={group.key}>
                      <Link
                        href={`/workshops/${workshop.id}`}
                        className="group flex items-center gap-4 rounded-2xl border border-purple-100 bg-white p-3 transition-all hover:border-purple-300 hover:shadow-md"
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-purple-50">
                          {workshop.image_url && (
                            <Image
                              src={optimizeImageUrl(workshop.image_url, 60)}
                              alt={workshop.title}
                              fill
                              className="object-cover"
                              sizes="80px"
                              loading="lazy"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-purple-700">
                            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                <Calendar className="w-4 h-4" />
                                <time dateTime={group.date}>{formatDate(group.date)}</time>
                              </span>
                              {group.times.length > 0 && (
                                <span className="whitespace-nowrap">{group.times.join('・')}</span>
                              )}
                            </span>
                            {isFamily && <FamilyFriendlyBadge size="sm" className="shadow-none" />}
                          </div>
                          <p className="mt-1 line-clamp-2 text-base font-bold text-gray-900">
                            {workshop.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">{formatPrice(workshop.price)}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 shrink-0 text-purple-400 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="mt-5 rounded-2xl border border-purple-100 bg-purple-50/60 p-6">
                <p className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <CalendarClock className="w-5 h-5 text-purple-600" />
                  次回の日程は調整中です
                </p>
                <p className="mt-3 text-base text-gray-600 leading-relaxed">
                  ご希望の日程をお送りいただければ、開催が決まり次第メールでお知らせします。
                </p>
                <Link
                  href="/workshops/categories"
                  className="mt-4 inline-flex items-center gap-2 text-base font-semibold text-purple-700 hover:text-purple-800"
                >
                  開催をリクエストする
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            <Link
              href="/workshops"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
            >
              すべての日程を見る
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* カテゴリピラーページへの内部リンク */}
        {categories.length > 0 && (
          <div className="mt-12 border-t border-purple-100 pt-10">
            <h3 className="text-xl font-bold text-gray-900">テーマから探す</h3>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/workshops/category/${c.slug}`}
                  className="group flex h-full flex-col justify-between gap-3 rounded-2xl border border-purple-100 bg-purple-50/50 p-5 transition-all hover:border-purple-300 hover:bg-purple-50"
                >
                  <span className="text-base font-bold text-gray-900 group-hover:text-purple-700">
                    {c.name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white px-3 py-1 text-sm font-semibold text-purple-700">
                    {c.upcomingCount > 0 ? (
                      <>
                        <Calendar className="w-3.5 h-3.5" />
                        開催予定 {c.upcomingCount}件
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        リクエスト受付中
                      </>
                    )}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              href="/workshops/categories"
              className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-purple-700 hover:text-purple-800"
            >
              カテゴリ一覧を見る
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
