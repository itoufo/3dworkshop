'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'

type Status = { available: boolean; reason: string | null; title?: string; remaining?: number }

const REASON_TEXT: Record<string, string> = {
  invalid: 'リンクが正しくありません。',
  not_paid: 'このご注文はダウンロードできません。',
  expired: 'ダウンロード期限が過ぎています。',
  used_up: 'ダウンロード回数の上限に達しました。',
}

export default function DownloadClient() {
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    if (!token || busy) return
    setBusy(true)
    setError(null)
    try {
      // ⚠ <form> にしない。Google アナリティクスがフォームの送信先（合言葉入りの URL）を記録する
      const res = await fetch(`/api/store/download/${token}`, { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !body.url) {
        setError(body.error || 'ダウンロードに失敗しました。時間をおいて再度お試しください。')
        return
      }
      setStatus((s) => (s && s.remaining != null ? { ...s, remaining: Math.max(0, s.remaining - 1) } : s))
      window.location.href = body.url
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const t = window.location.hash.slice(1)
    if (!/^[A-Za-z0-9_-]{40,}$/.test(t)) {
      setStatus({ available: false, reason: 'invalid' })
      return
    }
    setToken(t)
    fetch(`/api/store/download/${t}/status`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((s: Status) => setStatus(s))
      .catch(() => setStatus({ available: false, reason: 'invalid' }))
  }, [])

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">データのダウンロード</h1>
      {!status ? (
        <p className="mt-6 text-base text-gray-600">確認しています…</p>
      ) : !status.available || !token ? (
        <p className="mt-6 text-base text-red-600">
          {REASON_TEXT[status.reason ?? 'invalid'] ?? REASON_TEXT.invalid} お手数ですが 3dlab@sunu25.com までお問い合わせください。
        </p>
      ) : (
        <>
          <p className="mt-4 text-xl text-gray-800">{status.title}</p>
          <div className="mt-8">
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold disabled:opacity-60"
            >
              <Download className="w-5 h-5" />
              {busy ? '準備しています…' : 'ダウンロードする'}
            </button>
            {error && <p className="mt-4 text-base text-red-600">{error}</p>}
            <p className="mt-4 text-base text-gray-600">あと {status.remaining} 回ダウンロードできます。</p>
          </div>
        </>
      )}
    </div>
  )
}
