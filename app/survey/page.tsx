import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CalendarDays } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Breadcrumb } from '@/components/Breadcrumb'
import SurveyCard from '@/components/SurveyCard'
import SurveyWorkshopCta from '@/components/SurveyWorkshopCta'
import SurveyNotifyToggle from '@/components/SurveyNotifyToggle'
import { StructuredData, SurveyQuestionSchema } from '@/components/StructuredData'
import {
  formatSurveyDate,
  getClosedSurveys,
  getLatestClosedSurvey,
  getLiveSurvey,
  totalVotes,
} from '@/lib/surveys'

/**
 * ISR。1日1問の入れ替えは 12:00 の cron が行うので、その切り替わりが
 * 数分で反映される長さにしておく。⚠ blog と同じ 3600 にしない。
 * 通知を受けて開いた人が1時間前の設問を見ることになる。
 */
export const revalidate = 300

export const metadata: Metadata = {
  title: '3Dプリンターみんなのアンケート｜毎日1問・翌日に結果をお届け',
  description:
    '3Dプリンターやものづくりについて、毎日1問の2択アンケートを実施しています。回答すると翌日にみんなの集計結果が届きます。3Dプリンター教室3DLabが運営。',
  keywords: '3Dプリンター,アンケート,2択,みんなの意見,ものづくり,3Dプリンタ 教室',
  alternates: { canonical: '/survey' },
  openGraph: {
    title: '3Dプリンターみんなのアンケート｜毎日1問・翌日に結果をお届け',
    description:
      '3Dプリンターやものづくりについて毎日1問の2択アンケート。回答すると翌日にみんなの集計結果が届きます。',
    url: 'https://3dlab.jp/survey',
    siteName: '3DLab - 3Dプリンタ教室',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: '3Dプリンターみんなのアンケート' }],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3Dプリンターみんなのアンケート｜毎日1問',
    description: '3Dプリンターについて毎日1問の2択アンケート。回答すると翌日に結果が届きます。',
    images: ['/og-image.jpg'],
  },
}

export default async function SurveyPage() {
  const [liveSurvey, yesterday, recent] = await Promise.all([
    getLiveSurvey(),
    getLatestClosedSurvey(),
    getClosedSurveys(10),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      {liveSurvey && <StructuredData data={SurveyQuestionSchema(liveSurvey)} />}

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Breadcrumb items={[{ name: 'アンケート', href: '/survey' }]} />

        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
          3Dプリンターみんなのアンケート
        </h1>
        <p className="mt-3 text-gray-600">
          毎日1問、3Dプリンターとものづくりについて聞いています。回答すると、翌日にみんなの集計結果が届きます。
        </p>

        {/* 昨日の結果 → 今日の質問 の順で並べる。通知を開いた人がまず見たいのは結果のほう */}
        {yesterday && (
          <section className="mt-10" aria-labelledby="yesterday-heading">
            <h2
              id="yesterday-heading"
              className="mb-4 flex items-center gap-2 text-sm font-bold tracking-wide text-purple-700"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              {formatSurveyDate(yesterday.publish_date)}の結果
            </h2>
            <SurveyCard survey={yesterday} readOnly showShare />
            <p className="mt-3 text-right">
              <Link
                href={`/survey/${yesterday.slug}`}
                className="text-sm text-purple-600 hover:underline"
              >
                この結果のページを見る
              </Link>
            </p>
          </section>
        )}

        <section className="mt-12" aria-labelledby="today-heading">
          <h2
            id="today-heading"
            className="mb-4 text-sm font-bold tracking-wide text-pink-700"
          >
            今日の質問
          </h2>
          {liveSurvey ? (
            <SurveyCard survey={liveSurvey} />
          ) : (
            <div className="rounded-3xl border border-purple-100 bg-white p-8 text-center text-gray-600">
              今日の質問は準備中です。明日またのぞいてみてください。
            </div>
          )}
        </section>

        {/* 回答した直後がいちばん登録してもらいやすい。今日の質問のすぐ下に置く */}
        <div className="mt-8">
          <SurveyNotifyToggle />
        </div>

        {liveSurvey && (
          <div className="mt-8">
            <SurveyWorkshopCta survey={liveSurvey} />
          </div>
        )}

        {recent.length > 0 && (
          <section className="mt-14" aria-labelledby="past-heading">
            <h2 id="past-heading" className="mb-4 text-lg font-bold text-gray-900">
              これまでのアンケート
            </h2>
            <ul className="divide-y divide-purple-100 overflow-hidden rounded-2xl border border-purple-100 bg-white">
              {recent.map((survey) => (
                <li key={survey.id}>
                  <Link
                    href={`/survey/${survey.slug}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-purple-50"
                  >
                    <span>
                      <span className="block font-medium text-gray-900">{survey.question}</span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {formatSurveyDate(survey.publish_date)}・
                        {totalVotes(survey).toLocaleString('ja-JP')}人が回答
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-purple-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-center">
              <Link
                href="/survey/archive"
                className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-5 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
              >
                すべてのアンケートを見る
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </p>
          </section>
        )}
      </main>

      <Footer />
    </div>
  )
}
