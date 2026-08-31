import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Breadcrumb } from '@/components/Breadcrumb'
import SurveyCard from '@/components/SurveyCard'
import SurveyWorkshopCta from '@/components/SurveyWorkshopCta'
import { StructuredData, SurveyQuestionSchema } from '@/components/StructuredData'
import {
  formatSurveyDate,
  getSurveyBySlug,
  totalVotes,
  votePercentages,
} from '@/lib/surveys'

// 締切済みの設問は中身が変わらないので長めでよい
export const revalidate = 3600

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  // getSurveyBySlug は cache() 済み。ここと本体で2回引かれない
  const survey = await getSurveyBySlug(slug)

  if (!survey) {
    return {
      title: 'アンケート | 3DLab',
      description: '3Dプリンター教室3DLabのみんなのアンケート',
    }
  }

  const pct = votePercentages(survey)
  const total = totalVotes(survey)
  const title = `${survey.question}｜3Dプリンターみんなのアンケート`
  const description =
    survey.status === 'closed' && total > 0
      ? `${survey.question} ${total.toLocaleString('ja-JP')}人が回答し、${survey.option_a} ${pct.a}%、${survey.option_b} ${pct.b}% という結果でした。3Dプリンター教室3DLabのアンケート。`
      : `${survey.question} ${survey.option_a}か、${survey.option_b}か。3Dプリンター教室3DLabが毎日1問お聞きしています。`

  return {
    title,
    description,
    alternates: { canonical: `/survey/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://3dlab.jp/survey/${slug}`,
      siteName: '3DLab - 3Dプリンタ教室',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: survey.question }],
      locale: 'ja_JP',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.jpg'],
    },
  }
}

export default async function SurveyDetailPage({ params }: PageProps) {
  const { slug } = await params
  const survey = await getSurveyBySlug(slug)

  // RLS が draft を返さないので、未公開の設問はここで 404 になる
  if (!survey) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <StructuredData data={SurveyQuestionSchema(survey)} />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <Breadcrumb
          items={[
            { name: 'アンケート', href: '/survey' },
            { name: survey.question, href: `/survey/${survey.slug}` },
          ]}
        />

        <p className="text-sm text-gray-500">{formatSurveyDate(survey.publish_date)}のアンケート</p>

        <div className="mt-4">
          {/* 締切済みなら結果を出し、まだ受付中なら（＝今日の設問への直リンク）投票させる */}
          <SurveyCard survey={survey} readOnly={survey.status === 'closed'} showShare />
        </div>

        <div className="mt-8">
          <SurveyWorkshopCta survey={survey} />
        </div>

        <nav className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/survey"
            className="inline-flex items-center gap-1 text-sm text-purple-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            今日の質問に答える
          </Link>
          <Link
            href="/survey/archive"
            className="text-sm text-purple-600 hover:underline"
          >
            これまでのアンケート一覧
          </Link>
        </nav>
      </main>

      <Footer />
    </div>
  )
}
