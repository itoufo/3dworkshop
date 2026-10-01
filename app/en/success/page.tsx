import type { Metadata } from 'next'
import BookingSuccess from '@/components/BookingSuccess'

export const metadata: Metadata = {
  title: 'Booking complete | 3DLab Tokyo',
  robots: { index: false, follow: false },
}

export default function EnglishSuccessPage() {
  return (
    <div lang="en">
      <BookingSuccess locale="en" />
    </div>
  )
}
