import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'よくある質問（FAQ） | 3DLab',
  description:
    '3Dプリンタ体験ワークショップ・スクール・オーダーメイド制作についてよくいただくご質問をまとめました。初心者・お子さま連れ・PCなしでの参加、使用する3Dプリンター、制作物の品質や塗装について。',
  alternates: { canonical: 'https://3dlab.jp/faq' },
}

type QA = { q: string; a: string; link?: { href: string; label: string } }
type Category = { title: string; items: QA[] }

const categories: Category[] = [
  {
    title: 'ワークショップについて',
    items: [
      {
        q: '初心者ですが参加できますか？',
        a: 'はい、まったく問題ありません。参加される方のほとんどが初めての方です。スタッフが最初から一つひとつ丁寧にサポートしますので、安心してお越しください。',
      },
      {
        q: 'パソコンを持っていないのですが大丈夫ですか？',
        a: '大丈夫です。スマートフォンだけでご参加いただけます。ご希望の方には当日パソコンの貸し出しも可能ですので、手ぶらでお越しいただけます。',
      },
      {
        q: '小学生以下の子ども2人と、付き添いの保護者1人で参加できますか？',
        a: 'はい、可能です。小さなお子さま連れでも安心してご参加いただけます。ご家族での参加も大歓迎です。',
      },
      {
        q: '手描きの絵をもとにデザインしてもいいですか？',
        a: 'はい。会場に紙・ペン・クレヨンなどをご用意しています。その場で描いていただいた絵をもとにデザインしていくこともできます。',
      },
      {
        q: '「こんなものを作りたい」というデザインを持ち込んでもいいですか？',
        a: 'はい、大歓迎です。作りたいもののイメージやデザインをぜひお持ちください。当日、形にするお手伝いをいたします。',
      },
      {
        q: '使用する3Dプリンターはどこのメーカーのものですか？',
        a: '通常はBambu Lab社のA1・A1 miniを使って実演いたします。そのほか国内メーカーのプリンターもご用意しておりますので、機種を比較してみたい方にもおすすめです。時期によっては、光造形（レジン）方式のワークショップもご提供しています。',
      },
    ],
  },
  {
    title: 'スクールについて',
    items: [
      {
        q: 'スクールでどんなことをするのか知りたいです。',
        a: 'まずは実際に体験いただけるよう、ワークショップを開催しています。雰囲気や内容を知っていただくのが一番の近道ですので、ぜひ一度お越しください。',
        link: { href: '/workshops', label: 'ワークショップの日程を見る' },
      },
    ],
  },
  {
    title: '制作（オーダーメイド）について',
    items: [
      {
        q: '制作物の品質はどのくらいですか？',
        a: '3Dプリンター特有の積層痕が現れることがあります。形状によっては、サポート痕が残る場合もございます。また塗装が必要な場合は手作業となるため、色ムラや塗り漏れが生じることがあります。一点ものでのご提供となりますため、仕上がりにご満足いただけない場合も返金はいたしかねます。あらかじめご了承ください。',
      },
      {
        q: '塗装はしてもらえますか？',
        a: 'はい、可能です。手作業での塗装となるため、色ムラや塗り漏れが生じる場合がございます。',
      },
    ],
  },
]

// FAQPage 構造化データ（SEO / AI検索対策）
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: categories.flatMap((c) =>
    c.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.link ? `${item.a}（${item.link.label}）` : item.a,
      },
    }))
  ),
}

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
              よくある質問
            </h1>
            <p className="text-base text-gray-600 mb-10">
              ワークショップ・スクール・オーダーメイド制作について、よくいただくご質問をまとめました。
              このほかご不明な点は、お気軽に
              <a href="mailto:y-sato@sunu25.com" className="text-purple-600 hover:text-purple-700 font-medium">
                お問い合わせ
              </a>
              ください。
            </p>

            {categories.map((category) => (
              <section key={category.title} className="mb-10 last:mb-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-purple-100">
                  {category.title}
                </h2>

                <div className="space-y-3">
                  {category.items.map((item) => (
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
                          <div className="text-base leading-relaxed text-gray-700">
                            <p>{item.a}</p>
                            {item.link && (
                              <Link
                                href={item.link.href}
                                className="inline-flex items-center gap-1 mt-3 text-purple-600 hover:text-purple-700 font-medium"
                              >
                                {item.link.label}
                                <span aria-hidden="true">→</span>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <div className="mt-12 pt-8 border-t border-gray-100 text-center">
              <p className="text-base text-gray-600 mb-4">
                まずは実際に体験するのが一番わかりやすいです。
              </p>
              <Link
                href="/workshops"
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                ワークショップを予約する
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
