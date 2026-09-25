'use client'

import { useState } from 'react'
import Image from 'next/image'
import { uploadSellerFile } from '@/lib/store/upload-client'
import { IMAGE_MAX_BYTES, IMAGE_TYPES, SELLER_BIO_MAX, SELLER_NAME_MAX } from '@/lib/store/product-rules'

const input = 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-base'

export default function ProfileForm({
  initial,
}: {
  initial: { display_name: string; bio: string; avatar_url: string | null }
}) {
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function uploadAvatar(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!IMAGE_TYPES[file.type] || file.size > IMAGE_MAX_BYTES) {
      setError(`アイコンは JPEG / PNG / WebP、${IMAGE_MAX_BYTES / 1024 / 1024}MB までです`)
      return
    }
    setBusy(true)
    const result = await uploadSellerFile('image', file)
    setBusy(false)
    if ('error' in result) setError(result.error)
    else setV((prev) => ({ ...prev, avatar_url: result.publicUrl }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    const res = await fetch('/api/store/sell/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) setError(body.error || '保存に失敗しました')
    else setMessage('保存しました')
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-100">
          {v.avatar_url && <Image src={v.avatar_url} alt="アイコン" fill sizes="80px" className="object-cover" />}
        </div>
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-base" onChange={(e) => uploadAvatar(e.target.files?.[0])} />
      </div>
      <label className="block">
        <span className="text-base font-bold text-gray-800">表示名</span>
        <input className={input} maxLength={SELLER_NAME_MAX} value={v.display_name} onChange={(e) => setV({ ...v, display_name: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-base font-bold text-gray-800">紹介文</span>
        <textarea className={input} rows={5} maxLength={SELLER_BIO_MAX} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} />
      </label>
      {error && <p className="text-base text-red-600" role="alert">{error}</p>}
      {message && <p className="text-base text-green-700" role="status">{message}</p>}
      <button type="submit" disabled={busy} className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-base font-bold disabled:opacity-50">
        保存する
      </button>
    </form>
  )
}
