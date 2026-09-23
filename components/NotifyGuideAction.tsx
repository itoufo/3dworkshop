'use client'

import { useEffect, useState } from 'react'
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react'
import { getPushState, subscribeToPush, VAPID_PUBLIC_KEY, type PushState } from '@/lib/push-client'
import { gaEvent } from '@/lib/gtag'

/**
 * /notify の上部に出す「今すぐオンにする」ボタン。
 *
 * 手順を読み終えてホーム画面から開き直した人は、ここで押せば終わる。
 * Safari のまま（ios-needs-install）の人には何も出さず、下の手順を読んでもらう。
 *
 * ⚠ 購読する区分は PushSubscribeButton と同じ（app/api/push/subscribe/route.ts の SUBSCRIBE_TOPICS）。
 */
export default function NotifyGuideAction() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    getPushState().then(setState)
  }, [])

  if (!VAPID_PUBLIC_KEY || state === 'loading' || state === 'unsupported' || state === 'ios-needs-install') {
    return null
  }

  async function handleSubscribe() {
    setBusy(true)
    setMessage(null)
    const result = await subscribeToPush()
    setState(result.state)
    setBusy(false)
    if (result.ok) {
      gaEvent('push_subscribe', { topic: 'workshop_schedule', source: 'notify_guide' })
    } else {
      setMessage(result.error || '通知をオンにできませんでした')
    }
  }

  if (state === 'subscribed') {
    return (
      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-5">
        <CheckCircle2 className="h-7 w-7 shrink-0 text-green-600" aria-hidden="true" />
        <p className="text-lg font-bold text-green-900">通知はオンになっています。設定は完了です。</p>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-base text-amber-900">
        <p className="font-bold">通知がオフになっています</p>
        <p className="mt-1">iPhone の「設定」→「通知」→「3DLab」で、「通知を許可」をオンにしてください。</p>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl border-2 border-purple-300 bg-white p-5 text-center shadow-md">
      <p className="text-lg font-bold text-gray-900">あとはボタンを押すだけです</p>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <BellRing className="h-6 w-6" />}
        {busy ? '設定中...' : '通知を受け取る'}
      </button>
      {message && <p className="mt-3 text-base text-red-600">{message}</p>}
    </div>
  )
}
