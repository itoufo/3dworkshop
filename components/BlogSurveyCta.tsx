import Link from 'next/link'
import { MessageCircleQuestion, ArrowRight } from 'lucide-react'
import { getLiveSurvey } from '@/lib/surveys'

/**
 * 記事の末尾に置く、みんなのアンケート（/survey）への導線。
 *
 * 読み終わった直後は「自分はどう思うか」がいちばん立っている瞬間なので、
 * そこで今日の設問そのものを見せて /survey へ送る。
 * 「アンケートがあります」とだけ書くより、設問と2つの選択肢を見せたほうが押される。
 *
 * ⚠ トップの TopSurveyBanner はその場で答えさせる（SurveyCard を埋め込む）。
 *   こちらは記事本文の流れを切りたくないので、設問の提示までにして /survey へ渡す。
 *
 * ⚠ 記事ページは ISR（revalidate=3600）なので、12:00 の設問入れ替え直後は
 *   最大1時間だけ前の設問の文言が出うる。押した先の /survey は revalidate=300 で
 *   最新の設問を出すので、答える対象がずれることはない（見出しが古いだけ）。
 *
 * 受付中の設問が無いときは、過去問と結果のある /survey へ一般的な文言で送る。
 */
export default async function BlogSurveyCta() {
  const survey = await getLiveSurvey()

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <Link
        href="/survey"
        className="group block rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6 transition-all hover:border-purple-200 hover:shadow-lg sm:p-8"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-800">
          <MessageCircleQuestion className="h-4 w-4" aria-hidden="true" />
          {survey ? '今日の質問' : 'みんなのアンケート'}
        </span>

        <p className="mt-4 text-xl font-bold leading-snug text-gray-900 sm:text-2xl">
          {survey ? survey.question : '3Dプリンターのこと、どう思いますか？'}
        </p>

        {survey ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-4 py-2 text-base font-medium text-purple-700 shadow-sm">
              {survey.option_a}
            </span>
            <span className="rounded-full bg-white px-4 py-2 text-base font-medium text-pink-700 shadow-sm">
              {survey.option_b}
            </span>
          </div>
        ) : (
          <p className="mt-3 text-base text-gray-600">
            毎日1問の2択アンケート。これまでの質問とみんなの回答が見られます。
          </p>
        )}

        <span className="mt-6 inline-flex items-center gap-1 text-base font-bold text-purple-700 group-hover:text-purple-900">
          {survey ? '答えて結果を見る' : 'これまでの質問と結果を見る'}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </Link>
    </div>
  )
}
