/* 3DLab PWA サービスワーカー
 *
 * 役割は2つだけに絞っている:
 *   1. Web Push の受信と、通知タップでの画面遷移
 *   2. オフライン時の最低限のフォールバック表示
 *
 * ページ本体はキャッシュしない。3dlab.jp は在庫（残席）や日程が変わるサイトなので、
 * 古い HTML を出すと「予約できると思ったら満席」のような実害が出る。
 * キャッシュするのは変化しない静的アセットとオフライン用ページだけにする。
 */

// ⚠ 中身を変えたら必ず上げること。activate で「名前が違うキャッシュ」を消しているので、
//   名前が変わらない限り古い中身が residual として残り続ける。
const CACHE_VERSION = 'v2'
const STATIC_CACHE = `3dlab-static-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

// インストール時に必ず持っておくもの
const PRECACHE_URLS = [OFFLINE_URL, '/icons/icon-192.png', '/logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // ページ遷移: 常にネットワーク優先。落ちたときだけオフライン用ページを出す
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // 先に入れておいたもの（オフライン用ページ・アイコン）だけキャッシュから出す。
  //
  // ⚠ /_next/static をここでキャッシュに溜めない。デプロイのたびにファイル名のハッシュが
  //   変わるので、溜めると古いビルドのJS/CSSが端末に積み上がり続ける。
  //   キャッシュ名が変わらない限り activate では消えないため、数か月で数十MBになり、
  //   最後はブラウザにこのオリジンのストレージごと捨てられる
  //   （＝オフライン用ページまで失う。2026-08-31 のレビューで指摘）。
  //   /_next/static は CDN が immutable のキャッシュヘッダを付けて返すので、
  //   ブラウザのHTTPキャッシュに任せれば十分で、サービスワーカーが持つ意味がない。
  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)))
  }
  // それ以外（/_next/static・API・画像・HTML データ）はサービスワーカーを素通りさせる
})

// ===== Web Push =====

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: '3DLab', body: event.data ? event.data.text() : '' }
  }

  const title = payload.title || '3DLab'
  const options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    // 同じ tag の通知は上書きされる（同じ日程の再送で通知が積み上がらない）
    tag: payload.tag || '3dlab-notification',
    renotify: true,
    data: { url: payload.url || '/workshops' },
    lang: 'ja',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/workshops', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既に開いているタブがあればそれを使い回す
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus()
      }
      for (const client of clientList) {
        if ('navigate' in client && 'focus' in client) {
          return client.navigate(targetUrl).then((navigated) => navigated && navigated.focus())
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})

/** base64url の VAPID 公開鍵を subscribe() が要求する Uint8Array に変換する */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = self.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * 購読が期限切れなどでブラウザ側から差し替えられたとき、新しい購読をサーバーに送り直す。
 *
 * ⚠ applicationServerKey を必ず渡すこと。Chrome は event.oldSubscription を付けずに
 *   このイベントを投げることがあり、鍵なしの subscribe() は
 *   'Missing applicationServerKey' で失敗する。以前はその失敗を catch で捨てていたので、
 *   再登録されないまま DB に死んだ endpoint が残り、端末には二度と通知が来ないのに
 *   画面は「通知はオンです」と出し続けていた（2026-08-31 のレビューで指摘）。
 * ⚠ sw.js は静的ファイルなので鍵を焼き込めない。サーバーから取る。
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        let options = event.oldSubscription?.options
        if (!options?.applicationServerKey) {
          const res = await fetch('/api/push/public-key')
          if (!res.ok) throw new Error(`public-key ${res.status}`)
          const { publicKey } = await res.json()
          if (!publicKey) throw new Error('public-key empty')
          options = { userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }
        }

        const subscription = await self.registration.pushManager.subscribe(options)
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        })
        if (!response.ok) throw new Error(`subscribe ${response.status}`)
      } catch (error) {
        // ⚠ 黙って消さない。ここが落ちると端末は通知が来ないまま「オン」に見える
        console.error('[sw] pushsubscriptionchange 再登録に失敗:', error)
      }
    })()
  )
})
