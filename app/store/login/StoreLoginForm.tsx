'use client'

import { useState } from 'react'
import { miraiidBrowser } from '@/lib/store/miraiid-browser'

/** ログイン後に戻る先を、MiraiID から戻ってきた callback ページに引き継ぐ */
export const NEXT_STORAGE_KEY = 'store-login-next'

/** MiraiID のログインを store_session に引き換えて、ブラウザ側の MiraiID セッションは捨てる */
export async function exchangeForStoreSession(accessToken: string): Promise<string | null> {
  const res = await fetch('/api/store/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken }),
  })
  // ストアの権限判定は store_session だけで行う。MiraiID のトークンを残しておく理由が無い
  await miraiidBrowser().auth.signOut({ scope: 'local' }).catch(() => {})
  if (res.ok) return null
  const body = await res.json().catch(() => ({}))
  return body.error || 'ログインに失敗しました'
}

export default function StoreLoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function withGoogle() {
    setError(null)
    setBusy(true)
    try {
      sessionStorage.setItem(NEXT_STORAGE_KEY, next)
    } catch {}
    const { error } = await miraiidBrowser().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError('Google でのログインを始められませんでした')
      setBusy(false)
    }
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { data, error } = await miraiidBrowser().auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data.session) {
      setError('メールアドレスまたはパスワードが違います')
      setBusy(false)
      return
    }
    const problem = await exchangeForStoreSession(data.session.access_token)
    if (problem) {
      setError(problem)
      setBusy(false)
      return
    }
    window.location.href = next
  }

  return (
    <div className="mt-8 space-y-8">
      <button
        type="button"
        onClick={withGoogle}
        disabled={busy}
        className="w-full py-3 rounded-lg border border-gray-300 bg-white text-base font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        Google でログイン
      </button>

      <form onSubmit={withPassword} className="space-y-4">
        <label className="block">
          <span className="text-base text-gray-700">メールアドレス</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
        </label>
        <label className="block">
          <span className="text-base text-gray-700">パスワード</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-base font-bold disabled:opacity-50"
        >
          メールアドレスでログイン
        </button>
      </form>

      {error && <p className="text-base text-red-600" role="alert">{error}</p>}
    </div>
  )
}
