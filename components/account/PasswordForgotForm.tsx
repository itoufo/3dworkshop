'use client'

import { useState } from 'react'
import { fieldClass, labelClass, submitClass, FormMessage } from './AccountFormShell'

export default function PasswordForgotForm() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/account/password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || '送信に失敗しました')
      else setDone(data.message)
    } catch {
      setError('通信エラーが発生しました。時間をおいてお試しください。')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <FormMessage success={done} />
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className={labelClass}>メールアドレス</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className={fieldClass}
        />
      </div>
      <FormMessage error={error} />
      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? '送信中…' : '再設定用のリンクを送る'}
      </button>
    </form>
  )
}
