'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'
import type { Workshop } from '@/types'

interface Props {
  workshopId: string
  categoryId: string
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function RelatedWorkshopsLazy({ workshopId, categoryId }: Props) {
  const [items, setItems] = useState<Workshop[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/workshops?category_id=${categoryId}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((data) => {
        if (cancelled) return
        const today = todayIso()
        const list = (data.data || []) as Workshop[]
        const upcoming = list
          .filter((w) => w.id !== workshopId)
          .filter((w) => (w.sessions ?? []).some((s) => s.status === 'scheduled' && s.event_date >= today))
          .sort((a, b) => {
            const da = (a.sessions ?? [])
              .filter((s) => s.status === 'scheduled' && s.event_date >= today)
              .map((s) => s.event_date)
              .sort()[0] || '9999-12-31'
            const db = (b.sessions ?? [])
              .filter((s) => s.status === 'scheduled' && s.event_date >= today)
              .map((s) => s.event_date)
              .sort()[0] || '9999-12-31'
            return da.localeCompare(db)
          })
          .slice(0, 3)
        setItems(upcoming)
      })
      .catch(() => setItems([]))
    return () => {
      cancelled = true
    }
  }, [workshopId, categoryId])

  if (items === null) {
    return (
      <div className="mt-12">
        <div className="h-7 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
              <div className="w-full aspect-video bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 rounded" />
                <div className="h-5 w-1/3 bg-gray-200 rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) return null

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">関連ワークショップ</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {items.map((rw) => {
          const today = todayIso()
          const upcoming = (rw.sessions ?? [])
            .filter((s) => s.status === 'scheduled' && s.event_date >= today)
            .sort((a, b) => a.event_date.localeCompare(b.event_date))
          const rwDate = upcoming[0]?.event_date || rw.event_date
          return (
            <Link
              key={rw.id}
              href={`/workshops/${rw.id}`}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {rw.image_url ? (
                <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                  <Image
                    src={optimizeImageUrl(rw.image_url, 75)}
                    alt={rw.title}
                    fill
                    className="object-contain group-hover:scale-105 transition-transform duration-300"
                    sizes="33vw"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600">3D</span>
                </div>
              )}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-1">{rw.title}</h3>
                {rwDate && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Calendar className="w-3 h-3 mr-1 text-purple-500" />
                    {new Date(`${rwDate}T00:00:00`).toLocaleDateString('ja-JP', {
                      month: 'long', day: 'numeric', weekday: 'short',
                    })}
                  </p>
                )}
                <p className="text-lg font-bold text-gray-900 mt-2">¥{rw.price.toLocaleString()}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
