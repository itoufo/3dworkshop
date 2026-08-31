'use client'

// ブラウザ側の通知購読ヘルパー。
// サービスワーカーの登録・購読・解除と、そもそも通知が使える環境かの判定をまとめる。

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

export type PushState =
  /** ブラウザが Web Push に対応していない */
  | 'unsupported'
  /** iOS の Safari で、ホーム画面に追加されていない（追加すれば使える） */
  | 'ios-needs-install'
  /** 通知をブロック済み。ブラウザ設定から戻す必要がある */
  | 'denied'
  /** 使えるが、まだ購読していない */
  | 'unsubscribed'
  /** 購読済み */
  | 'subscribed'
  /** 判定中 */
  | 'loading'

/** VAPID 公開鍵（base64url）を pushManager.subscribe が要求する Uint8Array に変換する */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** ホーム画面から起動しているか（iOS はこの状態でないと通知を購読できない） */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari の独自プロパティ
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS はデスクトップ Safari を名乗る
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** サービスワーカーを登録して、使える状態になるまで待つ */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null
  try {
    const existing = await navigator.serviceWorker.getRegistration('/')
    if (existing) {
      await navigator.serviceWorker.ready
      return existing
    }
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    await navigator.serviceWorker.ready
    return registration
  } catch (error) {
    console.error('service worker registration failed:', error)
    return null
  }
}

/** 現在の状態を判定する */
export async function getPushState(): Promise<PushState> {
  // ⚠ iOS の判定を先に置くこと。iOS Safari はホーム画面に追加していなくても
  //   PushManager と Notification を持っているので、isPushSupported() を先に見ると
  //   ここが 'unsubscribed' になり、押しても許可が下りないボタンを出してしまう。
  //   案内したいのは「ホーム画面に追加してください」のほう（2026-08-31 のレビューで指摘）
  if (isIOS() && !isStandalone()) return 'ios-needs-install'
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'

  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  return subscription ? 'subscribed' : 'unsubscribed'
}

/**
 * 通知を購読してサーバーに登録する。
 * 必ずユーザー操作（クリック）の中から呼ぶこと。ブラウザが許可ダイアログを出さない。
 */
export async function subscribeToPush(): Promise<{ ok: boolean; state: PushState; error?: string }> {
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, state: 'unsupported', error: '通知の設定が未完了です（VAPID 公開鍵が未設定）' }
  }
  // ⚠ getPushState() と同じ順序にすること（iOS を先に見る）
  if (isIOS() && !isStandalone()) {
    return {
      ok: false,
      state: 'ios-needs-install',
      error: 'ホーム画面に追加すると通知を受け取れます',
    }
  }
  if (!isPushSupported()) {
    return { ok: false, state: 'unsupported', error: 'このブラウザは通知に対応していません' }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      ok: false,
      state: permission === 'denied' ? 'denied' : 'unsubscribed',
      error: '通知が許可されませんでした',
    }
  }

  const registration = await ensureServiceWorker()
  if (!registration) {
    return { ok: false, state: 'unsupported', error: '通知の準備に失敗しました' }
  }

  try {
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return { ok: false, state: 'unsubscribed', error: data.error || '登録に失敗しました' }
    }

    return { ok: true, state: 'subscribed' }
  } catch (error) {
    console.error('push subscribe failed:', error)
    return { ok: false, state: 'unsubscribed', error: '通知の登録に失敗しました' }
  }
}

/** 購読を解除し、サーバー側の登録も消す */
export async function unsubscribeFromPush(): Promise<{ ok: boolean; state: PushState }> {
  const registration = await navigator.serviceWorker.getRegistration('/')
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return { ok: true, state: 'unsubscribed' }

  const endpoint = subscription.endpoint
  await subscription.unsubscribe().catch(() => undefined)
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  }).catch(() => undefined)

  return { ok: true, state: 'unsubscribed' }
}
