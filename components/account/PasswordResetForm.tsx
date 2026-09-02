'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fieldClass, labelClass, submitClass, FormMessage } from './AccountFormShell'

export default function PasswordResetForm({ token }: { token: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('確認用のパスワードが一致しません')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/account/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '設定に失敗しました')
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
        <label className={labelClass}>新しいパスワード</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={10}
          autoComplete="new-password"
          className={fieldClass}
        />
        <p className="text-sm text-gray-500 mt-1">10文字以上</p>
      </div>
      <div>
        <label className={labelClass}>もう一度入力</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>
      <FormMessage error={error} />
      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? '設定中…' : 'パスワードを設定する'}
      </button>
      <p className="text-sm text-gray-500">
        パスワードを変更すると、ほかの端末でのログイン状態はすべて解除されます。
      </p>
    </form>
  )
}
