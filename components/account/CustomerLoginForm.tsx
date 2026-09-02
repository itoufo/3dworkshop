'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fieldClass, labelClass, submitClass, FormMessage } from './AccountFormShell'

export default function CustomerLoginForm() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'ログインできませんでした')
        setBusy(false)
        return
      }
      router.push('/account')
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいてお試しください。')
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className={labelClass}>メールアドレス</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="email"
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>パスワード</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="current-password"
          className={fieldClass}
        />
      </div>

      <FormMessage error={error} />

      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? 'ログイン中…' : 'ログイン'}
      </button>

      <div className="text-base text-gray-600 text-center space-y-1">
        <p>
          <Link href="/account/password/forgot" className="text-purple-600 underline hover:text-purple-700">
            パスワードをお忘れの方
          </Link>
        </p>
        <p>
          はじめての方は{' '}
          <Link href="/account/register" className="text-purple-600 underline hover:text-purple-700">
            会員登録
          </Link>
        </p>
      </div>
    </form>
  )
}
