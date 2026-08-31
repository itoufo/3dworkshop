'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Loader2, Share } from 'lucide-react'
import {
  ensureServiceWorker,
  getPushState,
  subscribeToPush,
  type PushState,
} from '@/lib/push-client'
import { gaEvent } from '@/lib/gtag'

/**
 * 「毎日の質問を通知で受け取る」の切り替え。
 *
 * ⚠ 購読そのもの（/api/push/subscribe）とは別の合意として扱う。
 *   サイトの通知は「新しい開催日程が追加されたとき」の約束で許可してもらっているので、
 *   毎日届く通知はここで明示的に選んでもらう（配信区分 'daily_survey'）。
 *
 * ⚠ iOS はホーム画面に追加していないと購読できない。getPushState() が
 *   'ios-needs-install' を先に返すので、その場合は許可ボタンではなく追加の案内を出す。
 */

const TOPIC = 'daily_survey'

export default function SurveyNotifyToggle() {
  const [pushState, setPushState] = useState<PushState>('loading')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  /** 今の購読状態と、この端末が daily_survey を受け取る設定かを読む */
  const refresh = useCallback(async () => {
    const state = await getPushState()
    setPushState(state)
    if (state !== 'subscribed') {
      setEnabled(false)
      return
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) {
        setEnabled(false)
        return
      }
      const response = await fetch(
        `/api/push/topics?endpoint=${encodeURIComponent(subscription.endpoint)}`
      )
      const data = await response.json().catch(() => ({}))
      setEnabled(Array.isArray(data.topics) && data.topics.includes(TOPIC))
    } catch {
      setEnabled(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function setTopic(next: boolean): Promise<boolean> {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return false

    const response = await fetch('/api/push/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint, topic: TOPIC, enabled: next }),
    })
    return response.ok
  }

  async function handleClick() {
    if (busy) return
    setBusy(true)
    setMessage(null)

    try {
      // まだ通知そのものを許可していない人は、先に購読してもらう。
      // ⚠ ここは必ずクリックの中。ブラウザは操作なしでは許可ダイアログを出さない
      if (pushState !== 'subscribed') {
        const result = await subscribeToPush()
        if (!result.ok) {
          setPushState(result.state)
          setMessage(result.error || '通知を有効にできませんでした')
          return
        }
        await ensureServiceWorker()
      }

      const next = !enabled
      const ok = await setTopic(next)
      if (!ok) {
        setMessage('設定を保存できませんでした。時間をおいてお試しください。')
        await refresh()
        return
      }

      setEnabled(next)
      setPushState('subscribed')
      setMessage(
        next
          ? '登録しました。毎日12時ごろ、前日の結果と新しい質問をお届けします。'
          : '毎日のアンケート通知を停止しました。'
      )
      gaEvent('survey_notify_toggle', { enabled: next })
    } catch (error) {
      console.error('survey notify toggle failed:', error)
      setMessage('設定の変更に失敗しました。時間をおいてお試しください。')
    } finally {
      setBusy(false)
    }
  }

  if (pushState === 'loading') return null

  // このブラウザではそもそも通知が使えない。押せないボタンを出さない
  if (pushState === 'unsupported') return null

  if (pushState === 'ios-needs-install') {
    return (
      <div className="rounded-2xl border border-purple-100 bg-white p-5">
        <p className="flex items-center gap-2 font-bold text-gray-900">
          <Bell className="h-5 w-5 text-purple-600" aria-hidden="true" />
          毎日の質問を通知で受け取る
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          iPhone・iPad では、ホーム画面に追加すると通知を受け取れます。画面下部の
          <Share className="mx-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
          共有ボタンから「ホーム画面に追加」を選んでください。
        </p>
      </div>
    )
  }

  if (pushState === 'denied') {
    return (
      <div className="rounded-2xl border border-purple-100 bg-white p-5">
        <p className="flex items-center gap-2 font-bold text-gray-900">
          <BellOff className="h-5 w-5 text-gray-400" aria-hidden="true" />
          通知はブロックされています
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          ブラウザの設定でこのサイトの通知を許可すると、毎日の質問を受け取れます。
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-purple-100 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 font-bold text-gray-900">
            <Bell className="h-5 w-5 text-purple-600" aria-hidden="true" />
            毎日の質問を通知で受け取る
          </p>
          <p className="mt-1 text-sm text-gray-600">
            毎日12時ごろ、前日の結果と新しい質問を1通でお届けします。
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          aria-pressed={enabled}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all hover:shadow-lg hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 ${
            enabled
              ? 'border border-purple-200 bg-white text-purple-700'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
          }`}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {enabled ? '通知を停止する' : '通知を受け取る'}
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-xl bg-purple-50 px-4 py-3 text-sm text-gray-700">{message}</p>
      )}
    </div>
  )
}
