import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calendar, Clock, Users } from 'lucide-react'
import { getUpcomingSessions } from '@/lib/workshops'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { enDateShort } from '@/lib/i18n'
import type { Workshop } from '@/types'

/** 英語ページのワークショップ一覧カード。直近の日程を最大4つ添える */
export default function EnglishWorkshopCards({ workshops }: { workshops: Workshop[] }) {
  // 直近の回が早い順（日程のないものは最後）
  const sorted = [...workshops]
    .map((w) => ({ w, upcoming: getUpcomingSessions(w) }))
    .sort((a, b) => {
      const ka = a.upcoming[0] ? `${a.upcoming[0].event_date} ${a.upcoming[0].event_time ?? ''}` : '9999'
      const kb = b.upcoming[0] ? `${b.upcoming[0].event_date} ${b.upcoming[0].event_time ?? ''}` : '9999'
      return ka.localeCompare(kb)
    })

  if (sorted.length === 0) {
    return (
      <p className="text-base text-gray-600 text-center py-12">
        There are no English-supported workshops scheduled right now. Email us at{' '}
        <a href="mailto:3dlab@sunu25.com" className="text-purple-600 font-medium">3dlab@sunu25.com</a> to ask about upcoming dates.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
      {sorted.map(({ w, upcoming }) => (
        <Link
          key={w.id}
          href={`/en/workshops/${w.id}`}
          className="group flex flex-col bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-shadow"
        >
          {w.image_url && (
            <div className="bg-gray-100">
              <Image
                src={optimizeImageUrl(w.image_url)}
                alt={w.title}
                width={1536}
                height={1024}
                className="w-full h-auto"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          <div className="flex flex-col flex-1 p-6">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">{w.title}</h3>
            {w.description && <p className="mt-3 text-base text-gray-600 line-clamp-4">{w.description}</p>}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-base text-gray-700">
              {w.duration ? (
                <span className="inline-flex items-center">
                  <Clock className="w-4 h-4 mr-1.5 text-purple-600" aria-hidden />
                  {w.duration >= 60 && w.duration % 60 === 0 ? `${w.duration / 60} hours` : `${w.duration} min`}
                </span>
              ) : null}
              <span className="inline-flex items-center">
                <Users className="w-4 h-4 mr-1.5 text-purple-600" aria-hidden />
                Up to {w.max_participants} people
              </span>
              <span className="font-bold text-gray-900">
                {w.price > 0 ? `¥${w.price.toLocaleString()} per person` : 'Free'}
              </span>
            </div>
            {upcoming.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {upcoming.slice(0, 4).map((s) => (
                  <li key={s.id} className="flex items-center text-base text-gray-800">
                    <Calendar className="w-4 h-4 mr-2 text-pink-500" aria-hidden />
                    {enDateShort(s.event_date)}
                    {s.event_time ? `, ${s.event_time.slice(0, 5)}` : ''}
                  </li>
                ))}
                {upcoming.length > 4 && (
                  <li className="text-base text-gray-500">+ {upcoming.length - 4} more dates</li>
                )}
              </ul>
            )}
            <span className="mt-6 inline-flex items-center justify-center self-start px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
              See details & book
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
            </span>
          </div>
        </Link>
      ))}
    </div>
  )
}
