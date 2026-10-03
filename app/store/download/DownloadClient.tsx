'use client'

import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useStoreLocale } from '@/components/store/StoreLocale'
import { STORE_UI } from '@/lib/store/ui-copy'

type Status = { available: boolean; reason: string | null; title?: string; remaining?: number }
type Reason = 'invalid' | 'not_paid' | 'expired' | 'used_up'

/** ダウンロード API（POST）が断ったときの HTTP ステータス → 理由（app/api/store/download/[token]/route.ts） */
const REASON_BY_STATUS: Record<number, Reason> = { 404: 'invalid', 403: 'not_paid', 410: 'expired', 429: 'used_up' }

/**
 * 購入メールのリンクの行き先。英語のメールのリンクは /en/download に来るので、文言は開いているページの言語に合わせる。
 * ⚠ API が返す文言は日本語なので、英語のページでは使わない。断られた理由は HTTP ステータスで見分ける。
 */
export default function DownloadClient() {
  const locale = useStoreLocale()
  const t = STORE_UI[locale].download
  const reasonText = (reason: string | null | undefined) => t.reasons[(reason as Reason) in t.reasons ? (reason as Reason) : 'invalid']
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
        const reason = REASON_BY_STATUS[res.status]
        setError(
          locale === 'en'
            ? reason
              ? `${t.reasons[reason]}${t.contact}`
              : t.failed
            : body.error || t.failed,
        )
        return
      }
      setStatus((s) => (s && s.remaining != null ? { ...s, remaining: Math.max(0, s.remaining - 1) } : s))
      window.location.href = body.url
    } catch {
      setError(t.networkError)
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
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{t.title}</h1>
      {!status ? (
        <p className="mt-6 text-base text-gray-600">{t.checking}</p>
      ) : !status.available || !token ? (
        <p className="mt-6 text-base text-red-600">
          {reasonText(status.reason)}
          {t.contact}
        </p>
      ) : (
        <>
          <p className="mt-4 text-xl text-gray-800" lang={locale === 'en' ? 'ja' : undefined}>
            {status.title}
          </p>
          <div className="mt-8">
            <button
              type="button"
              onClick={download}
              disabled={busy}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold disabled:opacity-60"
            >
              <Download className="w-5 h-5" />
              {busy ? t.preparing : t.button}
            </button>
            {error && <p className="mt-4 text-base text-red-600">{error}</p>}
            <p className="mt-4 text-base text-gray-600">{t.remaining(status.remaining ?? 0)}</p>
          </div>
        </>
      )}
    </div>
  )
}
