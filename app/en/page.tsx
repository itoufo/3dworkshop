import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Box, Mail, Printer, Sparkles, Wand2 } from 'lucide-react'
import Header from '@/components/Header'
import EnglishFooter from '@/components/en/EnglishFooter'
import EnglishAccess from '@/components/en/EnglishAccess'
import EnglishWorkshopCards from '@/components/en/EnglishWorkshopCards'
import WeeklyWorkshopCalendar from '@/components/WeeklyWorkshopCalendar'
import { getEnglishWorkshops } from '@/lib/workshops'

export const revalidate = 3600

const TITLE = 'AI × 3D Printer Workshops in Tokyo (English Support) | 3DLab Yushima'
const DESCRIPTION =
  'Design an original character with AI and turn it into a 3D-printed figure at 3DLab in Yushima, Tokyo. English-supported workshops for beginners, 1 minute from Yushima Station and walking distance from Akihabara.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: '/en',
    languages: { ja: '/', en: '/en', 'x-default': '/' },
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://3dlab.jp/en',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: '3DLab Tokyo' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/og-image.jpg'] },
}

const STEPS = [
  { icon: Sparkles, title: 'Imagine', body: 'Start from an idea, a photo, or a drawing of the character you want to make.' },
  { icon: Wand2, title: 'Design with AI', body: 'Use generative AI to develop your own character or mascot, with help from our instructors.' },
  { icon: Box, title: 'Turn it into 3D data', body: 'Learn how a design becomes 3D data that a printer can read.' },
  { icon: Printer, title: 'See it printed', body: 'Watch a live 3D printer demonstration. Your figure is printed after the session and mailed to you.' },
]

export default async function EnglishHomePage() {
  const workshops = await getEnglishWorkshops()

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden pt-28 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8" aria-label="Introduction">
          <div className="absolute inset-0">
            <Image src="/hero-bg.jpg" alt="" fill className="object-cover opacity-70" priority quality={90} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-white/70 to-pink-50/80 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto text-center">
            <p className="inline-flex items-center px-4 py-1.5 bg-purple-100 text-purple-700 rounded-full text-base font-medium">
              Yushima, Tokyo · near Akihabara
            </p>
            <h1 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Design a character with AI.
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Turn it into a figure you can hold.
              </span>
            </h1>
            <p className="mt-6 text-lg text-gray-700 leading-relaxed">
              3DLab is a creative studio in Yushima, Tokyo, where you can try generative AI and 3D printing in a small, hands-on
              workshop. Our English-supported sessions are made for beginners: no experience with AI, design, or 3D printing is
              needed.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/en/workshops"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-transform hover:-translate-y-0.5"
              >
                See workshops & dates
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden />
              </Link>
              <a
                href="#access"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-purple-200 bg-white text-purple-700 font-semibold hover:bg-purple-50 transition-colors"
              >
                How to get here
              </a>
            </div>
          </div>
        </section>

        {/* What you will do */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-purple-50 to-pink-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center">What you will do</h2>
            <p className="mt-4 text-lg text-gray-600 text-center max-w-2xl mx-auto">
              A 2-hour workshop that takes you from an idea to a 3D-printed figure.
            </p>
            <ol className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="bg-white rounded-2xl shadow-md p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <Icon className="w-6 h-6 text-purple-600" aria-hidden />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                  <p className="mt-2 text-base text-gray-600">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 1週間の開催スケジュール（英語ページに載せるワークショップだけ） */}
        <WeeklyWorkshopCalendar locale="en" />

        {/* Workshops */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">Workshops with English support</h2>
            <EnglishWorkshopCards workshops={workshops} />
          </div>
        </section>

        {/* Access */}
        <section id="access" className="py-16 px-4 sm:px-6 lg:px-8 bg-white scroll-mt-20">
          <div className="max-w-6xl mx-auto">
            <EnglishAccess />
          </div>
        </section>

        {/* Contact */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">Questions?</h2>
            <p className="mt-4 text-lg text-white/90">
              Email us in English or Japanese. We are happy to help with dates and any other questions.
            </p>
            <a
              href="mailto:3dlab@sunu25.com"
              className="mt-8 inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-purple-700 font-semibold shadow-lg hover:shadow-xl"
            >
              <Mail className="w-5 h-5 mr-2" aria-hidden />
              3dlab@sunu25.com
            </a>
            <p className="mt-6 text-base text-white/80">
              See also our <Link href="/en/faq" className="underline font-medium">frequently asked questions</Link>.
            </p>
          </div>
        </section>
      </main>
      <EnglishFooter />
    </div>
  )
}
