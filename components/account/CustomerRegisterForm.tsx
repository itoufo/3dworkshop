'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fieldClass, labelClass, submitClass, FormMessage } from './AccountFormShell'

export default function CustomerRegisterForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/account/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '登録に失敗しました')
      } else {
        setDone(data.message)
      }
    } catch {
      setError('通信エラーが発生しました。時間をおいてお試しください。')
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <FormMessage success={done} />
        <p className="text-base text-gray-600">
          メールが届かない場合は、迷惑メールフォルダをご確認ください。
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className={labelClass}>
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          autoComplete="name"
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="email"
          className={fieldClass}
        />
        <p className="text-sm text-gray-500 mt-1">
          これまでにご購入・ご予約いただいたメールアドレスでご登録いただくと、過去のご注文も表示されます。
        </p>
      </div>

      <div>
        <label className={labelClass}>電話番号</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          autoComplete="tel"
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>
          パスワード <span className="text-red-500">*</span>
        </label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          minLength={10}
          autoComplete="new-password"
          className={fieldClass}
        />
        <p className="text-sm text-gray-500 mt-1">10文字以上。他のサービスと同じものは避けてください。</p>
      </div>

      <FormMessage error={error} />

      <button type="submit" disabled={busy} className={submitClass}>
        {busy ? '送信中…' : '確認メールを送る'}
      </button>

      <p className="text-base text-gray-600 text-center">
        すでに登録済みの方は{' '}
        <Link href="/account/login" className="text-purple-600 underline hover:text-purple-700">
          ログイン
        </Link>
      </p>
    </form>
  )
}
