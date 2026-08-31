'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Share, X, Loader2 } from 'lucide-react'
import {
  getPushState,
  isIOS,
  subscribeToPush,
  VAPID_PUBLIC_KEY,
} from '@/lib/push-client'
import { gaEvent } from '@/lib/gtag'

/**
 * 来訪時に通知の購読をうながす。
 *
 * ブラウザによって「ページを開いただけで許可ダイアログを出せるか」が違うので、二段構えにする。
 *
 *   1. 出せるブラウザ（Chrome / Edge / Firefox）では、読み込み後に直接ダイアログを出す
 *   2. 出せなかった場合は、チャットボタンの上に自前の案内を出し、
 *      そのボタンを押してもらう（＝ユーザー操作になるので、どのブラウザでもダイアログが出る）
 *
 * ⚠ Safari では絶対に自動で requestPermission() を呼ばないこと。
 *   Safari はユーザー操作なしで呼ばれると 'denied' を返し、その拒否が最低7日間残る。
 *   一度やると、その端末には1週間まともに頼めなくなる。
 *
 * ⚠ Firefox は 72（2020-01）以降、操作なしの要求では 'default' を返してダイアログを出さない
 *   （アドレスバーの小さいアイコンに格納される）。害は無いので呼んでよい。
 *   Chrome も、拒否率の高いサイトや設定によっては同じくベルのアイコンに格納する
 *   （quieter notification permission UI）。その場合 Promise は保留のままになるため、
 *   下の AUTO_ASK_TIMEOUT_MS で見切りを付けて自前の案内へ倒す。
 */

/** 読み込み直後に出さない。ページを見る前に被せると内容が分からないまま拒否される */
const SHOW_DELAY_MS = 4000

/**
 * 押したあと、ボタンを押せない状態にしておく上限。
 * ⚠ Chrome の許可ダイアログを Esc や × で閉じると、requestPermission() の Promise が
 *   解決しないことがある（2026-08-31 に実機で確認）。待ち続けるとボタンが
 *   disabled のまま固まり、再読み込みするまで押せなくなる。時間を切って戻す。
 */
const BUSY_RELEASE_MS = 15000

/**
 * 自動のダイアログが「出なかった」と判断するまでの待ち時間。
 * ⚠ Chrome の静かなUIでは Promise が保留のままになる。待ち続けると案内も出せない。
 */
const AUTO_ASK_TIMEOUT_MS = 1500

/** 一度出したら、しばらく出さないための記録（この端末のブラウザにだけ残る） */
const ASKED_STORAGE_KEY = '3dlab_push_prompt_asked_at'
const ASK_AGAIN_AFTER_MS = 30 * 24 * 60 * 60 * 1000 // 30日

/** 自前の案内の出し方。null = 出さない */
type PromptMode =
  /** 通知を受け取るか尋ねる */
  | 'ask'
  /** iOS で、ホーム画面に追加しないと購読できない状態 */
  | 'ios-install'

function readAskedAt(): number | null {
  try {
    const raw = window.localStorage.getItem(ASKED_STORAGE_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    // プライベートモード等で localStorage が使えない場合。毎回聞くよりは出さない側に倒す
    return null
  }
}

function rememberAsked() {
  try {
    window.localStorage.setItem(ASKED_STORAGE_KEY, String(Date.now()))
  } catch {
    // 保存できなくても動作は続ける
  }
}

/**
 * WebKit（Safari 系）か。
 * ⚠ iOS はブラウザの見た目が Chrome でも中身は WebKit なので、iOS は全部これに含める。
 */
function isWebKitBrowser(): boolean {
  if (isIOS()) return true
  const ua = navigator.userAgent
  return /safari/i.test(ua) && !/chrome|chromium|crios|android|edg|fxios|opr/i.test(ua)
}

export default function PushAutoPrompt() {
  const pathname = usePathname()
  const [mode, setMode] = useState<PromptMode | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const startedRef = useRef(false)

  const close = useCallback(() => {
    rememberAsked()
    setMode(null)
  }, [])

  useEffect(() => {
    // ⚠ 管理画面には出さない。編集中に許可ダイアログが被ると誤操作のもと
    if (pathname?.startsWith('/admin')) return
    if (!VAPID_PUBLIC_KEY) return
    // 画面遷移のたびに走らせない
    if (startedRef.current) return
    startedRef.current = true

    const askedAt = readAskedAt()
    if (askedAt !== null && Date.now() - askedAt < ASK_AGAIN_AFTER_MS) return

    let cancelled = false

    const timer = window.setTimeout(async () => {
      const state = await getPushState()
      if (cancelled) return

      // 既に購読済み／拒否済み／そもそも使えない環境では何も出さない
      if (state === 'subscribed' || state === 'denied' || state === 'unsupported') return

      if (state === 'ios-needs-install') {
        gaEvent('push_prompt_shown', { variant: 'ios_install' })
        setMode('ios-install')
        return
      }

      // ここから state === 'unsubscribed'

      if (isWebKitBrowser()) {
        // Safari は自動で呼ぶと 7日間効く拒否になる。自前の案内から押してもらう
        gaEvent('push_prompt_shown', { variant: 'webkit_manual' })
        setMode('ask')
        return
      }

      gaEvent('push_prompt_auto_requested', {})

      // ⚠ 保留のままになることがあるので、時間を切って自前の案内に倒す
      const timedOut = Symbol('timeout')
      const result = await Promise.race([
        Notification.requestPermission().then((p) => {
          // 静かなUIのあとから許可された場合も、ここで購読まで進む
          if (p === 'granted') {
            void subscribeToPush().then((r) => {
              if (r.ok) {
                gaEvent('push_subscribe', { topic: 'workshop_schedule', source: 'auto_prompt' })
                if (!cancelled) {
                  setMode(null)
                  rememberAsked()
                }
              }
            })
          }
          return p
        }),
        new Promise<typeof timedOut>((resolve) =>
          window.setTimeout(() => resolve(timedOut), AUTO_ASK_TIMEOUT_MS),
        ),
      ])

      if (cancelled) return

      if (result === 'granted') {
        rememberAsked()
        return
      }
      if (result === 'denied') {
        // 本人が「許可しない」を選んだ。案内を重ねて出さない
        gaEvent('push_prompt_denied', { variant: 'auto' })
        rememberAsked()
        return
      }

      // 'default'（閉じられた）か、時間切れ（ダイアログが出ていない）
      gaEvent('push_prompt_shown', { variant: 'fallback_banner' })
      setMode('ask')
    }, SHOW_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [pathname])

  async function handleSubscribe() {
    setBusy(true)
    setMessage(null)
    // ⚠ 解決しない可能性があるので、必ず戻す保険を掛けてから待つ
    const releaseTimer = window.setTimeout(() => setBusy(false), BUSY_RELEASE_MS)
    const result = await subscribeToPush()
    window.clearTimeout(releaseTimer)
    setBusy(false)
    if (result.ok) {
      gaEvent('push_subscribe', { topic: 'workshop_schedule', source: 'auto_prompt_banner' })
      setMessage('通知をオンにしました。')
      rememberAsked()
      window.setTimeout(() => setMode(null), 2000)
      return
    }
    if (result.state === 'ios-needs-install') {
      setMode('ios-install')
      return
    }
    gaEvent('push_prompt_denied', { variant: 'banner' })
    setMessage(result.error || '通知をオンにできませんでした')
    rememberAsked()
  }

  if (!mode) return null

  return (
    // ⚠ チャットボタン（z-40・bottom-[86px] / md:bottom-6）の上に置く。
    //   z-30 にしてあるので、チャットのパネルを開いたらそちらが上に来て隠れる
    <div
      role="dialog"
      aria-label="通知の設定"
      className="fixed bottom-[144px] right-4 z-30 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl md:bottom-[82px] md:right-6"
    >
      <button
        type="button"
        onClick={close}
        aria-label="閉じる"
        className="absolute right-2 top-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-4 w-4" />
      </button>

      {mode === 'ios-install' ? (
        <>
          <p className="pr-6 text-base font-bold text-gray-900">
            新しい開催日程を通知で受け取る
          </p>
          <p className="mt-2 text-base leading-relaxed text-gray-600">
            iPhone・iPad では、共有ボタン
            <Share className="mx-1 inline h-4 w-4 align-text-bottom" />
            から「ホーム画面に追加」をすると、通知を受け取れるようになります。
          </p>
        </>
      ) : (
        <>
          <p className="pr-6 text-base font-bold text-gray-900">
            新しい開催日程をお知らせしましょうか？
          </p>
          <p className="mt-1 text-base leading-relaxed text-gray-600">
            体験ワークショップの日程が決まったときにお届けします。いつでもオフにできます。
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-base font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              通知を受け取る
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-full px-3 py-2.5 text-base text-gray-500 hover:bg-gray-100"
            >
              あとで
            </button>
          </div>
          {message && <p className="mt-2 text-base text-purple-700">{message}</p>}
        </>
      )}
    </div>
  )
}
