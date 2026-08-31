import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Breadcrumb } from '@/components/Breadcrumb'
import {
  countClosedSurveys,
  formatSurveyDate,
  getClosedSurveys,
  totalVotes,
  votePercentages,
} from '@/lib/surveys'

export const revalidate = 3600

const PER_PAGE = 30

export const metadata: Metadata = {
  title: 'これまでのアンケート一覧｜3Dプリンターみんなのアンケート',
  description:
    '3Dプリンターとものづくりについて、これまでにお聞きしたアンケートの結果一覧です。毎日1問ずつ増えています。3Dプリンター教室3DLabが運営。',
  alternates: { canonical: '/survey/archive' },
  openGraph: {
    title: 'これまでのアンケート一覧｜3Dプリンターみんなのアンケート',
    description: '3Dプリンターについてお聞きしたアンケートの結果一覧です。',
    url: 'https://3dlab.jp/survey/archive',
    siteName: '3DLab - 3Dプリンタ教室',
    locale: 'ja_JP',
    type: 'website',
  },
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function SurveyArchivePage({ searchParams }: PageProps) {
  const { page } = await searchParams
  const currentPage = Math.max(1, parseInt(page || '1', 10) || 1)
  const offset = (currentPage - 1) * PER_PAGE

  const [surveys, total] = await Promise.all([
    getClosedSurveys(PER_PAGE, offset),
    countClosedSurveys(),
  ])
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { name: 'アンケート', href: '/survey' },
            { name: 'これまでのアンケート', href: '/survey/archive' },
          ]}
        />

        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
          これまでのアンケート
        </h1>
        <p className="mt-3 text-gray-600">
          {total.toLocaleString('ja-JP')}問のアンケート結果を公開しています。
        </p>

        {surveys.length === 0 ? (
          <p className="mt-10 rounded-2xl border border-purple-100 bg-white p-8 text-center text-gray-600">
            結果が確定したアンケートはまだありません。
          </p>
        ) : (
          <ul className="mt-8 space-y-3">
            {surveys.map((survey) => {
              const pct = votePercentages(survey)
              return (
                <li key={survey.id}>
                  <Link
                    href={`/survey/${survey.slug}`}
                    className="block rounded-2xl border border-purple-100 bg-white p-5 transition-all hover:shadow-lg hover:scale-[1.01]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="font-bold text-gray-900">{survey.question}</h2>
                      <ArrowRight
                        className="mt-1 h-4 w-4 shrink-0 text-purple-400"
                        aria-hidden="true"
                      />
                    </div>

                    {/* 一覧の時点で結果が読める。ここで内容が伝わるほど検索結果からの流入が読み進める */}
                    <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-purple-100">
                      <span className="bg-purple-600" style={{ width: `${pct.a}%` }} />
                      <span className="bg-pink-500" style={{ width: `${pct.b}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-x-4 text-xs text-gray-600">
                      <span>
                        <span className="font-bold text-purple-600">{pct.a}%</span> {survey.option_a}
                      </span>
                      <span>
                        <span className="font-bold text-pink-500">{pct.b}%</span> {survey.option_b}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatSurveyDate(survey.publish_date)}・
                      {totalVotes(survey).toLocaleString('ja-JP')}人が回答
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="ページ送り">
            {currentPage > 1 && (
              <Link
                href={currentPage === 2 ? '/survey/archive' : `/survey/archive?page=${currentPage - 1}`}
                className="rounded-full border border-purple-200 px-5 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
              >
                前のページ
              </Link>
            )}
            <span className="text-sm text-gray-600">
              {currentPage} / {totalPages}
            </span>
            {currentPage < totalPages && (
              <Link
                href={`/survey/archive?page=${currentPage + 1}`}
                className="rounded-full border border-purple-200 px-5 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50"
              >
                次のページ
              </Link>
            )}
          </nav>
        )}
      </main>

      <Footer />
    </div>
  )
}
