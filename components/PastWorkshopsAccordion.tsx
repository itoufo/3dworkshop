'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar, ChevronDown } from 'lucide-react'
import { Workshop } from '@/types'
import { optimizeImageUrl } from '@/lib/image-optimization'

interface PastWorkshopsAccordionProps {
  workshops: Workshop[]
  /** Show category badge on each card */
  showCategory?: boolean
  /** Number of items to show in the first visible row */
  visibleCount?: number
}

export default function PastWorkshopsAccordion({
  workshops,
  showCategory = false,
  visibleCount = 3,
}: PastWorkshopsAccordionProps) {
  const [expanded, setExpanded] = useState(false)

  if (workshops.length === 0) return null

  const visibleWorkshops = workshops.slice(0, visibleCount)
  const hiddenWorkshops = workshops.slice(visibleCount)
  const hasMore = hiddenWorkshops.length > 0

  return (
    <section className={showCategory ? 'mt-20' : ''}>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">過去の開催</h2>

      {/* Always visible: first row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {visibleWorkshops.map((workshop) => (
          <WorkshopCard key={workshop.id} workshop={workshop} showCategory={showCategory} />
        ))}
      </div>

      {/* Expandable: remaining rows */}
      {hasMore && (
        <>
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mt-4 sm:mt-6 lg:mt-8 overflow-hidden transition-all duration-500 ease-in-out ${
              expanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {hiddenWorkshops.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} showCategory={showCategory} />
            ))}
          </div>

          <div className="text-center mt-6">
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              {expanded ? '閉じる' : `他${hiddenWorkshops.length}件を表示`}
              <ChevronDown
                className={`w-4 h-4 ml-1 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </>
      )}
    </section>
  )
}

function WorkshopCard({ workshop, showCategory }: { workshop: Workshop; showCategory: boolean }) {
  return (
    <Link
      href={`/workshops/${workshop.id}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden opacity-75 hover:opacity-100"
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
        {showCategory && workshop.category && (
          <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 backdrop-blur text-gray-600 text-xs font-medium rounded-full">
            {workshop.category.name}
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{workshop.title}</h3>
        {workshop.event_date && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        )}
      </div>
    </Link>
  )
}
