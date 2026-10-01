'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { miraiidBrowser } from '@/lib/store/miraiid-browser'
import { safeNextPath } from '@/lib/store/safe-next'
import { exchangeForStoreSession, NEXT_STORAGE_KEY } from '../../login/StoreLoginForm'

/**
 * MiraiID（Google ログイン）から戻ってくるページ。
 * URL の code を MiraiID のセッションに交換し、それを store_session に引き換える。
 * ⚠ code の交換はブラウザでしかできない（PKCE の検証用の値がブラウザに保存されているため）。
 */
export default function StoreAuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    // 開発時の StrictMode で2回走ると、2回目の交換が失敗して画面がエラーになる
    if (started.current) return
    started.current = true

    ;(async () => {
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) {
        setError('ログインがキャンセルされたか、期限が切れました')
        return
      }
      const { data, error } = await miraiidBrowser().auth.exchangeCodeForSession(code)
      if (error || !data.session) {
        setError('ログインを確認できませんでした')
        return
      }
      const problem = await exchangeForStoreSession(data.session.access_token)
      if (problem) {
        setError(problem)
        return
      }
      let next = '/'
      try {
        next = safeNextPath(sessionStorage.getItem(NEXT_STORAGE_KEY))
        sessionStorage.removeItem(NEXT_STORAGE_KEY)
      } catch {}
      window.location.replace(next)
    })()
  }, [])

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-16 text-center">
      {error ? (
        <>
          <p className="text-base text-red-600" role="alert">{error}</p>
          <Link href="/login" className="mt-6 inline-block text-base text-purple-700 underline">
            ログイン画面に戻る
          </Link>
        </>
      ) : (
        <p className="text-base text-gray-700">ログインしています…</p>
      )}
    </div>
  )
}
