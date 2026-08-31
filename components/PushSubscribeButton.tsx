'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Share, Loader2 } from 'lucide-react'
import {
  getPushState,
  isIOS,
  subscribeToPush,
  unsubscribeFromPush,
  VAPID_PUBLIC_KEY,
  type PushState,
} from '@/lib/push-client'
import { gaEvent } from '@/lib/gtag'

/**
 * 通知の購読ボタン。フッター（暗い背景）に置く前提の配色にしてある。
 *
 * 通知の許可ダイアログはユーザー操作の中でしか出せないので、必ずクリック起点にする。
 * iOS の Safari はホーム画面に追加しないと通知を購読できないため、その場合は手順を案内する。
 *
 * ⚠ 文言は「実際に何が届くか」と揃えること。届く区分は
 *   app/api/push/subscribe/route.ts の SUBSCRIBE_TOPICS が決めている。
 *   日程追加（workshop_schedule）と、管理画面からのお知らせ（announcement）の両方が届く。
 *   片方だけにするなら、あちらの配列とここの文言を同時に直す。
 */
export default function PushSubscribeButton() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    getPushState().then(setState)
  }, [])

  // 通知の設定自体が済んでいない環境では、押せないボタンを見せない
  if (!VAPID_PUBLIC_KEY || state === 'loading' || state === 'unsupported') {
    return null
  }

  async function handleSubscribe() {
    setBusy(true)
    setMessage(null)
    const result = await subscribeToPush()
    setState(result.state)
    setBusy(false)
    if (result.ok) {
      setMessage('通知をオンにしました。新しい日程が決まったらお知らせします。')
      gaEvent('push_subscribe', { topic: 'workshop_schedule' })
    } else {
      setMessage(result.error || '通知をオンにできませんでした')
    }
  }

  async function handleUnsubscribe() {
    setBusy(true)
    setMessage(null)
    const result = await unsubscribeFromPush()
    setState(result.state)
    setBusy(false)
    setMessage('通知をオフにしました。')
    gaEvent('push_unsubscribe', { topic: 'workshop_schedule' })
  }

  // ⚠ 本文に text-xs / text-sm を使わない（~/.claude/rules/design/lp-design-rules.md）。
  //   加えてフッターは bg-gray-900 なので、text-gray-500 だとコントラストが 3:1 程度しか出ず、
  //   同意を求めている当の一文が読みにくい。gray-300 まで上げる
  const headingClass = 'text-lg font-semibold text-gray-100 mb-3'
  const noteClass = 'text-base text-gray-300 mt-2'

  // iOS Safari: ホーム画面に追加しないと通知を購読できない
  if (state === 'ios-needs-install') {
    return (
      <div className="text-center">
        <p className={headingClass}>新しい開催日程を通知で受け取る</p>
        <p className={noteClass}>
          iPhone・iPad では、共有ボタン
          <Share className="inline w-4 h-4 mx-1 align-text-bottom" />
          から「ホーム画面に追加」をすると、通知を受け取れるようになります。
        </p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="text-center">
        <p className={headingClass}>新しい開催日程を通知で受け取る</p>
        <p className={noteClass}>
          このブラウザで通知がブロックされています。
          {isIOS() ? '設定アプリ' : 'アドレスバーの鍵アイコン'}から通知を「許可」に変更してください。
        </p>
      </div>
    )
  }

  const subscribed = state === 'subscribed'

  return (
    <div className="text-center">
      <p className={headingClass}>
        {subscribed ? '開催日程の通知はオンです' : '新しい開催日程を通知で受け取る'}
      </p>
      <button
        type="button"
        onClick={subscribed ? handleUnsubscribe : handleSubscribe}
        disabled={busy}
        className={
          subscribed
            ? 'inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-500 text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50 text-base'
            : 'inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:shadow-lg transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 text-base'
        }
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : subscribed ? (
          <BellOff className="w-5 h-5" />
        ) : (
          <BellRing className="w-5 h-5" />
        )}
        {busy ? '設定中...' : subscribed ? '通知をオフにする' : '通知をオンにする'}
      </button>
      {!subscribed && (
        <p className={noteClass}>
          <Bell className="inline w-4 h-4 mr-1 align-text-bottom" />
          新しい開催日程と、3DLabからのお知らせをお届けします。いつでもオフにできます。
        </p>
      )}
      {message && <p className={`${noteClass} text-purple-300`}>{message}</p>}
    </div>
  )
}
