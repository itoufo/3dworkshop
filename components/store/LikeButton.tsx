'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'

interface Props {
  productId: string
  initialCount: number
  initialLiked: boolean
  loggedIn: boolean
}

/** 作品の「いいね」。ログインしていなければログイン画面へ（戻ってくる先つき） */
export default function LikeButton({ productId, initialCount, initialLiked, loggedIn }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    if (!loggedIn) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
      return
    }
    if (busy) return
    setBusy(true)
    const next = !liked
    // 先に見た目を変え、失敗したら戻す
    setLiked(next)
    setCount((c) => c + (next ? 1 : -1))
    try {
      const res = await fetch(`/api/store/products/${productId}/like`, {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      if (typeof data.count === 'number') setCount(data.count)
    } catch {
      setLiked(!next)
      setCount((c) => c + (next ? -1 : 1))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? 'いいねを取り消す' : 'いいねする'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-base transition-colors ${
        liked ? 'border-pink-300 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-700 hover:border-pink-300'
      }`}
    >
      <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
      いいね {count > 0 && <span className="font-medium">{count}</span>}
    </button>
  )
}
