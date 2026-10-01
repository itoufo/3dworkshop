import type { Metadata } from 'next'
import Header from '@/components/Header'
import EnglishFooter from '@/components/en/EnglishFooter'
import EnglishWorkshopCards from '@/components/en/EnglishWorkshopCards'
import WeeklyWorkshopCalendar from '@/components/WeeklyWorkshopCalendar'
import { getEnglishWorkshops } from '@/lib/workshops'

export const revalidate = 3600

const TITLE = 'Workshops with English Support | 3DLab Tokyo'
const DESCRIPTION =
  'Upcoming AI × 3D printer workshops with English support at 3DLab in Yushima, Tokyo. See dates, prices, and book online.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: '/en/workshops',
    languages: { ja: '/workshops', en: '/en/workshops', 'x-default': '/workshops' },
  },
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://3dlab.jp/en/workshops', images: ['/og-image.jpg'] },
}

export default async function EnglishWorkshopsPage() {
  const workshops = await getEnglishWorkshops()
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main>
        <section className="pt-28 pb-10 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">Workshops with English support</h1>
            <p className="mt-5 text-lg text-gray-600">
              Hands-on AI and 3D printing workshops at 3DLab in Yushima, Tokyo — 1 minute from Yushima Station, a short walk
              from Akihabara.
            </p>
          </div>
        </section>
        <WeeklyWorkshopCalendar locale="en" />
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">All workshops</h2>
            <EnglishWorkshopCards workshops={workshops} />
          </div>
        </section>
      </main>
      <EnglishFooter />
    </div>
  )
}
