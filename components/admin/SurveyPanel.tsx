'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import type { Survey } from '@/lib/surveys'

interface Category {
  slug: string
  name: string
}

/**
 * 管理画面のアンケートタブ。
 *
 * ・在庫（公開日未割当の draft）が何日分あるかの確認
 * ・AI が作った設問の校正と、公開日の割り当て
 * ・締切済みの結果の確認
 *
 * 公開そのものは毎日12時の cron（/api/cron/daily-survey）が行うので、
 * ここで公開日を空のままにしておいても、古い順に自動で1問ずつ出ていく。
 */

const STATUS_LABEL: Record<string, string> = {
  draft: '未公開',
  scheduled: '公開日決定',
  live: '受付中',
  closed: '締切済み',
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-green-100 text-green-700',
  closed: 'bg-purple-100 text-purple-700',
}

export default function SurveyPanel() {
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(false)
  const [stock, setStock] = useState(0)
  const [pending, setPending] = useState<Survey[]>([])
  const [closed, setClosed] = useState<Survey[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/surveys')
      if (response.status === 401) {
        setAuthError(true)
        return
      }
      const data = await response.json()
      if (!response.ok) {
        setMessage(data.error || '一覧の取得に失敗しました')
        return
      }
      setAuthError(false)
      setStock(data.stock)
      setPending(data.pending || [])
      setClosed(data.closed || [])
      setCategories(data.categories || [])
    } catch {
      setMessage('一覧の取得に失敗しました（通信エラー）')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function patch(id: string, changes: Record<string, unknown>) {
    setSavingId(id)
    setMessage(null)
    try {
      const response = await fetch('/api/admin/surveys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...changes }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error || '更新に失敗しました')
        // ⚠ 失敗したら必ず読み直す。画面の値だけ変わって DB と食い違うのを避ける
        await load()
        return
      }
      setPending((rows) => rows.map((r) => (r.id === id ? { ...r, ...data.survey } : r)))
      setMessage('保存しました')
    } catch {
      setMessage('更新に失敗しました（通信エラー）')
    } finally {
      setSavingId(null)
    }
  }

  async function remove(id: string, question: string) {
    if (!confirm(`「${question}」を削除します。よろしいですか？`)) return
    setSavingId(id)
    try {
      const response = await fetch(`/api/admin/surveys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setMessage(data.error || '削除に失敗しました')
        return
      }
      setPending((rows) => rows.filter((r) => r.id !== id))
      setStock((n) => Math.max(0, n - 1))
      setMessage('削除しました')
    } finally {
      setSavingId(null)
    }
  }

  if (authError) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
        <p className="text-gray-700">
          管理画面のログインが古くなっています。一度ログアウトして、入り直してください。
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-12 text-gray-500 shadow-xl">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        読み込み中…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 在庫 */}
      <div className="rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <ClipboardList className="h-5 w-5 text-purple-600" aria-hidden="true" />
              アンケートの在庫
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              公開日が決まっていない設問が <span className="font-bold">{stock}</span> 問（＝あと
              {stock}日ぶん）あります。毎日12時に1問ずつ自動で公開されます。
            </p>
          </div>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            再読み込み
          </button>
        </div>

        {stock < 7 && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            在庫が1週間を切っています。
            <code className="rounded bg-amber-100 px-1">scripts/survey-generator.sh</code>
            を実行して補充してください。
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-xl bg-purple-50 px-4 py-3 text-sm text-gray-700">{message}</p>
        )}
      </div>

      {/* 未公開・受付中 */}
      <div className="space-y-4">
        {pending.map((survey) => (
          <div key={survey.id} className="rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[survey.status]}`}
              >
                {STATUS_LABEL[survey.status]}
              </span>
              <span className="text-xs text-gray-500">/survey/{survey.slug}</span>
              {savingId === survey.id && (
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" aria-hidden="true" />
              )}
              {survey.status === 'draft' && (
                <button
                  onClick={() => remove(survey.id, survey.question)}
                  disabled={savingId === survey.id}
                  className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  削除
                </button>
              )}
            </div>

            <label className="block text-xs font-medium text-gray-500">設問</label>
            <input
              defaultValue={survey.question}
              onBlur={(e) =>
                e.target.value !== survey.question && patch(survey.id, { question: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-500">選択肢A</label>
                <input
                  defaultValue={survey.option_a}
                  onBlur={(e) =>
                    e.target.value !== survey.option_a &&
                    patch(survey.id, { option_a: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">選択肢B</label>
                <input
                  defaultValue={survey.option_b}
                  onBlur={(e) =>
                    e.target.value !== survey.option_b &&
                    patch(survey.id, { option_b: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>

            <label className="mt-3 block text-xs font-medium text-gray-500">結果ページの解説</label>
            <textarea
              defaultValue={survey.result_comment || ''}
              rows={2}
              onBlur={(e) =>
                e.target.value !== (survey.result_comment || '') &&
                patch(survey.id, { result_comment: e.target.value })
              }
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-500">
                  公開日（空ならストックとして古い順に自動公開）
                </label>
                <input
                  type="date"
                  defaultValue={survey.publish_date || ''}
                  onBlur={(e) =>
                    e.target.value !== (survey.publish_date || '') &&
                    patch(survey.id, {
                      publish_date: e.target.value || null,
                      // 日付を入れたら「公開日決定」に、外したらストックに戻す
                      ...(survey.status !== 'live'
                        ? { status: e.target.value ? 'scheduled' : 'draft' }
                        : {}),
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500">関連カテゴリ</label>
                <select
                  defaultValue={survey.related_category_slug || ''}
                  onChange={(e) =>
                    patch(survey.id, { related_category_slug: e.target.value || null })
                  }
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
                >
                  <option value="">（なし）</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}

        {pending.length === 0 && (
          <p className="rounded-2xl bg-white p-8 text-center text-gray-600 shadow-xl">
            未公開の設問がありません。scripts/survey-generator.sh で補充してください。
          </p>
        )}
      </div>

      {/* 締切済み */}
      {closed.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold text-gray-900">締切済みの結果</h2>
          <ul className="divide-y divide-gray-100">
            {closed.map((survey) => {
              const total = survey.count_a + survey.count_b
              const pctA = total ? Math.round((survey.count_a / total) * 100) : 0
              return (
                <li key={survey.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium text-gray-900">{survey.question}</span>
                    <span className="text-xs text-gray-500">
                      {survey.publish_date}・{total.toLocaleString('ja-JP')}人
                    </span>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-gray-100">
                    <span className="bg-purple-600" style={{ width: `${pctA}%` }} />
                    <span className="bg-pink-500" style={{ width: `${100 - pctA}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-600">
                    <span>
                      {survey.option_a} {pctA}%
                    </span>
                    <span>
                      {survey.option_b} {total ? 100 - pctA : 0}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
