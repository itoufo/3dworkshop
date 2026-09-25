'use client'

import { useState } from 'react'
import { SELLER_BIO_MAX, SELLER_NAME_MAX, SELLER_SLUG_PATTERN } from '@/lib/store/product-rules'

const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base'

export default function ApplyForm() {
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!SELLER_SLUG_PATTERN.test(slug)) {
      setError('ページのURLは半角英小文字・数字・ハイフンで3〜40文字にしてください')
      return
    }
    setBusy(true)
    const res = await fetch('/api/store/sell/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, slug, bio }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error || '申請に失敗しました')
      setBusy(false)
      return
    }
    window.location.reload()
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-base text-gray-800 font-bold">表示名</span>
        <input className={input} required maxLength={SELLER_NAME_MAX} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <span className="text-base text-gray-500">作品ページに出る名前です。本名でなくてかまいません。</span>
      </label>
      <label className="block">
        <span className="text-base text-gray-800 font-bold">出品者ページの URL</span>
        <div className="mt-1 flex items-center gap-1 text-base">
          <span className="text-gray-500 whitespace-nowrap">stores.3dlab.jp/s/</span>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="taro-3d"
          />
        </div>
        <span className="text-base text-gray-500">半角英小文字・数字・ハイフン。あとから変えられません。</span>
      </label>
      <label className="block">
        <span className="text-base text-gray-800 font-bold">紹介文（任意）</span>
        <textarea className={input} rows={4} maxLength={SELLER_BIO_MAX} value={bio} onChange={(e) => setBio(e.target.value)} />
      </label>
      <label className="flex items-start gap-2 text-base text-gray-800">
        <input type="checkbox" className="mt-1.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>自分でつくった（または権利を持っている）作品だけを出品します。</span>
      </label>
      {error && <p className="text-base text-red-600" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={busy || !agreed}
        className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-base font-bold disabled:opacity-50"
      >
        出品者として申請する
      </button>
    </form>
  )
}
