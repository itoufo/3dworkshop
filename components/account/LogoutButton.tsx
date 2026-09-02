'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    await fetch('/api/account/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-base text-gray-700 hover:bg-gray-100 disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      {busy ? 'ログアウト中…' : 'ログアウト'}
    </button>
  )
}
