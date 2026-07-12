import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Calendar, ArrowRight } from 'lucide-react'
import { getFeaturedWorkshop, getNearestUpcomingSession } from '@/lib/workshops'
import { optimizeImageUrl } from '@/lib/image-optimization'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const wd = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日(${wd})`
}

/**
 * 「特別ワークショップ」告知バナー。ピン留めされた upcoming ワークショップを
 * トップ / ブログから詳細ページ(/workshops/[id])へ誘導する。
 * 対象が無ければ何も表示しない（null）。
 *
 * - 既定(full): 画像＋タイトル＋日程＋価格＋CTA の大きめバナー（トップ用）
 * - compact:    スリムな1行バー（ブログ用）
 */
export default async function SpecialWorkshopBanner({
  compact = false,
}: {
  compact?: boolean
}) {
  const w = await getFeaturedWorkshop()
  if (!w) return null

  const next = getNearestUpcomingSession(w)
  const href = `/workshops/${w.id}`

  if (compact) {
    return (
      <div className="mb-8">
        <Link
          href={href}
          className="group flex items-center gap-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-4 text-white shadow-lg transition-shadow hover:shadow-xl"
        >
          <Sparkles className="w-5 h-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white/80">特別ワークショップ</div>
            <div className="truncate font-bold text-base">{w.title}</div>
          </div>
          {next && (
            <span className="hidden shrink-0 items-center gap-1 text-sm sm:inline-flex">
              <Calendar className="w-4 h-4" />
              {formatDate(next.event_date)}
            </span>
          )}
          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-4 py-2 text-sm font-bold text-purple-700 transition-transform group-hover:scale-105">
            詳細
            <ArrowRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    )
  }

  return (
    <section className="mx-auto my-8 max-w-7xl px-4 sm:px-6 lg:px-8">
      <Link
        href={href}
        className="group relative block overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 shadow-2xl"
      >
        <div className="pointer-events-none absolute -right-6 -top-10 select-none text-[9rem] font-black leading-none text-white/10">
          3D
        </div>
        <div className="relative flex flex-col items-stretch md:flex-row">
          {w.image_url && (
            <div className="relative aspect-video w-full md:aspect-auto md:min-h-[240px] md:w-2/5">
              <Image
                src={optimizeImageUrl(w.image_url, 75)}
                alt={w.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center p-6 text-white md:p-10">
            <span className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold backdrop-blur">
              <Sparkles className="w-4 h-4" />
              特別ワークショップ
            </span>
            <h2 className="mb-3 text-2xl font-bold leading-snug md:text-3xl">
              {w.title}
            </h2>
            <div className="mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-base">
              {next && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-5 h-5" />
                  {formatDate(next.event_date)} 開催
                </span>
              )}
              <span className="font-bold">¥{w.price.toLocaleString()}〜</span>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-6 py-3 text-base font-bold text-purple-700 shadow-lg transition-transform group-hover:scale-105">
              詳細・お申し込み
              <ArrowRight className="w-5 h-5" />
            </span>
          </div>
        </div>
      </Link>
    </section>
  )
}
