'use client'

import { useEffect } from 'react'
import { ensureServiceWorker } from '@/lib/push-client'

/**
 * サービスワーカーの登録だけを行う。画面には何も描画しない。
 *
 * ホーム画面への追加（インストール）とオフライン表示に必要。
 * 通知の購読は別で、ユーザーがボタンを押したときに行う（PushSubscribeButton）。
 */
export default function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // 初回表示を優先するため、ページの読み込みが落ち着いてから登録する
    const timer = window.setTimeout(() => {
      ensureServiceWorker()
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [])

  return null
}
