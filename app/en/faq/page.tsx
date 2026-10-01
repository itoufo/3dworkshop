import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import EnglishFooter from '@/components/en/EnglishFooter'

const TITLE = 'FAQ | 3DLab Tokyo'
const DESCRIPTION =
  'Frequently asked questions about the AI × 3D printer workshops at 3DLab in Tokyo: experience needed, computers, children and parents, 3D printers, cancellation, and shipping your figure.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: '/en/faq',
    languages: { ja: '/faq', en: '/en/faq', 'x-default': '/faq' },
  },
  openGraph: { title: TITLE, description: DESCRIPTION, url: 'https://3dlab.jp/en/faq', locale: 'en_US', siteName: '3DLab Tokyo' },
}

type QA = { q: string; a: string }

// 日本語の /faq のうち、ワークショップに関する項目の英訳。
// キャンセル規定は /terms 第5条、発送の条件は英語対応ワークショップの説明文に書いてあることだけを載せる。
// スクール・オーダーメイド制作の項目は日本語でのみ提供しているサービスのため載せていない
const ITEMS: QA[] = [
  {
    q: 'I am a complete beginner. Can I join?',
    a: 'Yes, absolutely. Most of our participants are trying this for the first time. Our staff will support you step by step from the very beginning, so you can come along with confidence.',
  },
  {
    q: 'I do not have a computer. Is that OK?',
    a: 'Yes. You can take part with just a smartphone. If you would like, we can also lend you a computer on the day, so you can come empty-handed.',
  },
  {
    q: 'Can two children of elementary school age or younger take part with one accompanying parent?',
    a: 'Yes. On sessions marked "Recommended for families", one parent who only accompanies is free and does not count toward the session capacity, so please enter the two children as the number of participants when booking. On regular sessions without that mark, please include the accompanying parent in the number of participants (charged as one seat). Families are very welcome either way.',
  },
  {
    q: 'Can I base my design on a hand-drawn picture?',
    a: 'Yes. We have paper, pens, crayons and more at the venue, and you can design from a picture you draw on the spot.',
  },
  {
    q: 'Can I bring my own design idea of something I want to make?',
    a: 'Yes, please do. Bring any image or design of what you would like to make, and we will help you turn it into a real object on the day.',
  },
  {
    q: 'Which 3D printers do you use?',
    a: 'We usually demonstrate with Bambu Lab A1 and A1 mini printers. We also have printers from Japanese manufacturers, so it is a good chance to compare models. We are not currently running resin (SLA) workshops; resin printing is only available in our school.',
  },
  {
    q: 'What is the cancellation policy?',
    a: 'If you cancel by the day before the event, cancellation is free and we refund the full amount you paid (we also cover the payment fees). We cannot give refunds for cancellations on the day of the event or if you do not attend without notice. If we cancel a workshop for our own reasons, we refund the full amount.',
  },
  {
    q: 'Can I take my figure home on the day?',
    a: 'In figure workshops, your finished figure is printed after the workshop and shipped to you, as described in the participation agreement shown on the booking form. If you have questions about delivery, please email us.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: 'en',
  mainEntity: ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

export default function EnglishFaqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Frequently asked questions</h1>
            <p className="text-base text-gray-600 mb-10">
              Answers to common questions about our workshops. If you have any other questions, feel free to{' '}
              <a href="mailto:3dlab@sunu25.com" className="text-purple-600 hover:text-purple-700 font-medium">
                email us
              </a>
              .
            </p>

            <div className="space-y-3">
              {ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-gray-200 bg-gray-50/60 open:bg-white open:shadow-sm transition-colors"
                >
                  <summary className="flex items-start justify-between gap-3 cursor-pointer list-none px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-2 text-base md:text-lg font-semibold text-gray-900">
                      <span className="text-purple-500 shrink-0">Q.</span>
                      <span>{item.q}</span>
                    </span>
                    <svg
                      className="w-5 h-5 mt-1 shrink-0 text-purple-400 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 -mt-1">
                    <div className="flex items-start gap-2">
                      <span className="text-pink-500 font-semibold shrink-0">A.</span>
                      <p className="text-base leading-relaxed text-gray-700">{item.a}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 text-center">
              <p className="text-base text-gray-600 mb-4">The easiest way to understand it is to try it yourself.</p>
              <Link
                href="/en/workshops"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                Book a workshop
              </Link>
            </div>
          </div>
        </div>
      </main>
      <EnglishFooter />
    </div>
  )
}
