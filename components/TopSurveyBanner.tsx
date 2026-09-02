import Link from 'next/link'
import { MessageCircleQuestion, ArrowRight } from 'lucide-react'
import SurveyCard from '@/components/SurveyCard'
import { getLiveSurvey } from '@/lib/surveys'

/**
 * トップページに置く、今日のアンケートへの導線。
 *
 * その場で答えられるように、/survey と同じ SurveyCard をそのまま埋め込む。
 * 「アンケートがあります」と知らせてから別ページへ送ると、そこで大半が落ちる。
 *
 * ⚠ 受付中の設問が無いときは何も出さない（null）。
 *   SpecialWorkshopBanner と同じ扱い方。
 *
 * ⚠ トップは ISR（1時間）なので、設問が切り替わった直後は最大1時間だけ
 *   前の設問が表示されうる。その状態で投票しても SurveyCard が
 *   「締め切られた」と受け取って結果表示に切り替えるので、壊れはしない。
 */
export default async function TopSurveyBanner() {
  const survey = await getLiveSurvey()
  if (!survey) return null

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white/70" aria-label="今日のアンケート">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-4 py-1.5 text-sm font-bold text-purple-800">
            <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
            今日の質問
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900">
            3Dプリンターのこと、どう思いますか？
          </h2>
          <p className="mt-2 text-base text-gray-600">
            2つのうちどちらかを選ぶだけ。結果はその場で見られます。
          </p>
        </div>

        <SurveyCard survey={survey} />

        <p className="mt-4 text-center">
          <Link
            href="/survey"
            className="inline-flex items-center gap-1 text-base font-medium text-purple-700 hover:text-purple-900"
          >
            これまでの質問と結果を見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  )
}
