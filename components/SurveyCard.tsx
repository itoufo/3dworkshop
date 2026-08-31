'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import SurveyPieChart from './SurveyPieChart'
import SurveyShareButtons from './SurveyShareButtons'
import { getAnsweredChoice, getDeviceId, rememberAnswer } from '@/lib/survey-client'
import type { Survey } from '@/lib/surveys'
import { gaEvent } from '@/lib/gtag'

/**
 * 2択に答えて、その場で結果のグラフを見せるカード。
 *
 * ⚠ 投票前に集計を見せないこと。先に多数派が分かると、それに寄せた回答が増えて
 *   翌日に届ける結果の意味が薄くなる（同調バイアス）。締切済みの設問は最初から結果を出す。
 */

interface SurveyCardProps {
  survey: Survey
  /** 締切済みの設問。投票させず結果だけ出す */
  readOnly?: boolean
  /** 共有ボタンを出す */
  showShare?: boolean
}

type Counts = { a: number; b: number }

function percentages(counts: Counts): { a: number; b: number } {
  const total = counts.a + counts.b
  if (total === 0) return { a: 0, b: 0 }
  // ⚠ 片方だけ丸めて、もう片方は残りにする（両方丸めると合計が101%になりうる）
  const a = Math.round((counts.a / total) * 100)
  return { a, b: 100 - a }
}

export default function SurveyCard({ survey, readOnly = false, showShare = false }: SurveyCardProps) {
  const [counts, setCounts] = useState<Counts>({ a: survey.count_a, b: survey.count_b })
  const [choice, setChoice] = useState<'a' | 'b' | null>(null)
  const [submitting, setSubmitting] = useState<'a' | 'b' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [closedMidVote, setClosedMidVote] = useState(false)
  const router = useRouter()

  // ⚠ localStorage はサーバーには無い。最初の描画はサーバーと同じ「未回答」にして、
  //   マウント後に読む。ここで直接読むと hydration が食い違う
  useEffect(() => {
    if (readOnly) return
    setChoice(getAnsweredChoice(survey.id))
  }, [survey.id, readOnly])

  const revealed = readOnly || closedMidVote || choice !== null
  const pct = percentages(counts)

  async function vote(picked: 'a' | 'b') {
    if (submitting || revealed) return
    setSubmitting(picked)
    setError(null)

    try {
      const response = await fetch('/api/survey/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: survey.id,
          deviceId: getDeviceId(),
          choice: picked,
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        // ⚠ 締切と同時に押した人を行き止まりにしない。このページは最大5分キャッシュされるので、
        //   12:00 の切り替え直後は「投票できる見た目のまま締切済み」になりうる。
        //   ボタンを押した動機は結果を見ることなので、エラーだけ出して終わらせず結果を出す。
        if (response.status === 409) {
          setClosedMidVote(true)
          setError('この質問は受付を終了しました。結果をご覧ください。')
          // 手元の集計はキャッシュ時点のものなので、確定値に差し替える
          router.refresh()
          return
        }
        setError(data.error || '回答の送信に失敗しました。時間をおいてお試しください。')
        return
      }

      setCounts({ a: data.countA, b: data.countB })
      setChoice(picked)
      rememberAnswer(survey.id, picked)
      gaEvent('survey_answer', {
        survey_slug: survey.slug,
        choice: picked,
        already: !!data.already,
      })
    } catch {
      setError('通信エラーが発生しました。時間をおいてお試しください。')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{survey.question}</h2>
      {survey.description && (
        <p className="mt-2 text-gray-600">{survey.description}</p>
      )}

      {!revealed ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(['a', 'b'] as const).map((key) => {
            const label = key === 'a' ? survey.option_a : survey.option_b
            const busy = submitting === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => vote(key)}
                disabled={submitting !== null}
                className={`flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-bold text-white transition-all hover:shadow-lg hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 ${
                  key === 'a'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500'
                    : 'bg-gradient-to-r from-pink-600 to-pink-500'
                }`}
              >
                {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
                {label}
              </button>
            )
          })}
        </div>
      ) : (
        <div className="mt-8">
          <SurveyPieChart
            percentA={pct.a}
            percentB={pct.b}
            labelA={survey.option_a}
            labelB={survey.option_b}
            total={counts.a + counts.b}
            animate={!readOnly}
          />

          {choice && (
            <p className="mt-6 text-center text-sm text-gray-600">
              あなたは「
              <span className="font-bold text-gray-900">
                {choice === 'a' ? survey.option_a : survey.option_b}
              </span>
              」を選びました。
              {pct[choice] >= 50 ? '多数派です。' : '少数派です。'}
            </p>
          )}

          {survey.result_comment && (
            <p className="mt-4 rounded-2xl bg-purple-50 p-4 text-sm leading-relaxed text-gray-700">
              {survey.result_comment}
            </p>
          )}

          {showShare && (
            <div className="mt-6">
              <SurveyShareButtons survey={survey} percentA={pct.a} percentB={pct.b} />
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
