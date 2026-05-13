'use client'

import dynamic from 'next/dynamic'
import type { Workshop } from '@/types'

const WorkshopBookingSection = dynamic(() => import('./WorkshopBookingSection'), {
  ssr: false,
  loading: () => <BookingSkeleton />,
})

interface Props {
  workshop: Workshop
  relatedWorkshops: Workshop[]
  isPastWorkshop: boolean
}

export default function WorkshopBookingSectionLazy(props: Props) {
  return <WorkshopBookingSection {...props} />
}

function BookingSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-24 animate-pulse">
      <div className="h-7 w-32 bg-gray-200 rounded mb-6" />
      <div className="bg-gray-100 rounded-xl p-6 mb-6">
        <div className="h-4 w-20 bg-gray-200 rounded mb-3" />
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-10 bg-gray-100 rounded-xl" />
        <div className="h-12 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full mt-6" />
      </div>
    </div>
  )
}
