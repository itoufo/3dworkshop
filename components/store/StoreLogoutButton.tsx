'use client'

import { useState } from 'react'
import { useStoreLocale } from './StoreLocale'

export default function StoreLogoutButton({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false)
  const locale = useStoreLocale()

  async function logout() {
    setBusy(true)
    try {
      await fetch('/api/store/auth/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    } finally {
      window.location.href = locale === 'en' ? '/en' : '/'
    }
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={className}>
      {locale === 'en' ? 'Log out' : 'ログアウト'}
    </button>
  )
}
