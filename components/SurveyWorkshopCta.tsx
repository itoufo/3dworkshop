import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getWorkshop } from '@/lib/workshops'
import type { Survey } from '@/lib/surveys'

/**
 * 設問に紐づくワークショップへの導線。
 *
 * 紐付けが無ければ一覧へ送る。⚠ 何も出さない選択はしない。アンケートの回答直後は
 * このテーマへの関心がいちばん高い瞬間で、そこに行き先が無いと検索流入が読んで終わる。
 */
export default async function SurveyWorkshopCta({ survey }: { survey: Survey }) {
  const workshop = survey.related_workshop_id
    ? await getWorkshop(survey.related_workshop_id)
    : null

  const href = workshop
    ? `/workshops/${workshop.id}`
    : survey.related_category_slug
      ? `/workshops/category/${survey.related_category_slug}`
      : '/workshops'

  const label = workshop ? workshop.title : 'ワークショップ一覧を見る'
  const lead = workshop
    ? 'この話題を、実際に手を動かして体験できます'
    : '3Dプリンターを実際に触ってみませんか'

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white transition-all hover:shadow-lg hover:scale-[1.01]"
    >
      <span>
        <span className="block text-sm text-purple-100">{lead}</span>
        <span className="mt-1 block text-lg font-bold">{label}</span>
      </span>
      <ArrowRight
        className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1"
        aria-hidden="true"
      />
    </Link>
  )
}
