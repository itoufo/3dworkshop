'use client'

import { useEffect, useState } from 'react'

export interface BookableSessionInput {
  id: string
  workshop_id: string
  /** 開始時刻（JST）の epoch ms */
  start_ms: number
  /** 予約0人のときの締切（JST）の epoch ms。設定がなければ null */
  zero_booking_cutoff_ms: number | null
}

/**
 * カテゴリページの「予約可能な日程」から、閲覧時点で申し込めない回を除く。
 *
 * ページは ISR（最大1時間古い）で、しかも予約0人締切は参加人数を見ないと決まらない。
 * サーバーで絞るだけだと、締切を過ぎた回が「この日程を予約する」のまま残り、
 * 押すと詳細ページでリクエスト受付に切り替わる（2026-10-04 に 10/4 の回で発生）。
 * 詳細ページ（WorkshopBookingSection）と同じく、締切を過ぎた回だけ /api/check-availability に問い合わせる。
 */
export function useBookableSessions<T extends BookableSessionInput>(sessions: T[]): T[] {
  const [closedIds, setClosedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const now = Date.now()
    const started = sessions.filter(s => s.start_ms <= now).map(s => s.id)
    const candidates = sessions.filter(
      s => s.start_ms > now && s.zero_booking_cutoff_ms !== null && s.zero_booking_cutoff_ms <= now
    )
    if (started.length === 0 && candidates.length === 0) return
    let cancelled = false
    Promise.all(
      candidates.map(async s => {
        const params = new URLSearchParams({ workshopId: s.workshop_id, sessionId: s.id })
        const res = await fetch(`/api/check-availability?${params.toString()}`)
        if (!res.ok) return null
        const data = await res.json()
        return data?.is_closed ? s.id : null
      })
    )
      .then(ids => {
        if (cancelled) return
        setClosedIds(new Set([...started, ...ids.filter((id): id is string => !!id)]))
      })
      .catch(err => console.error('Error checking closed sessions:', err))
    return () => {
      cancelled = true
    }
  }, [sessions])

  return closedIds.size === 0 ? sessions : sessions.filter(s => !closedIds.has(s.id))
}
