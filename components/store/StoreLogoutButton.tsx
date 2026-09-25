'use client'

import { useState } from 'react'

export default function StoreLogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false)

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/store/auth/session', { method: 'DELETE' })
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      ログアウト
    </button>
  )
}
