'use client'

// 管理画面から「開催日程を追加したら通知を送る」ためのクライアント側ヘルパー。
//
// 日程追加は通知必須。保存後にこれを必ず呼び、結果を管理者に見せる。
// 送信の可否・文面はサーバー側で決めるので、ここは呼び出しと結果整形だけを担う。

export interface NotifyScheduleResult {
  ok: boolean
  /** 同じ日程を通知済みだったため送らなかった */
  skipped: boolean
  /** 管理者にそのまま見せる文言 */
  message: string
  sent?: number
  failed?: number
}

export async function notifyWorkshopSchedule(params: {
  workshopId: string
  eventDate: string
  eventTime?: string | null
  /** 通知済みの日程をあえて送り直す */
  force?: boolean
}): Promise<NotifyScheduleResult> {
  try {
    const response = await fetch('/api/push/notify-workshop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workshopId: params.workshopId,
        eventDate: params.eventDate,
        eventTime: params.eventTime || null,
        force: !!params.force,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      // 管理画面のログインを更新する前のセッションだと 401 になる
      if (response.status === 401) {
        return {
          ok: false,
          skipped: false,
          message: '通知の送信権限がありません。一度ログアウトして、管理画面に入り直してください。',
        }
      }
      return {
        ok: false,
        skipped: false,
        message: data.error || `通知の送信に失敗しました (${response.status})`,
      }
    }

    if (data.skipped) {
      return {
        ok: true,
        skipped: true,
        message: data.message || 'この日程はすでに通知済みのため、送信しませんでした',
      }
    }

    if (data.total === 0) {
      return {
        ok: true,
        skipped: false,
        sent: 0,
        failed: 0,
        message: '通知の登録者がまだいないため、届け先はありませんでした',
      }
    }

    return {
      ok: true,
      skipped: false,
      sent: data.sent,
      failed: data.failed,
      message: `通知を ${data.sent} 件に送信しました${data.failed ? `（${data.failed} 件は失敗）` : ''}`,
    }
  } catch (error) {
    console.error('notify schedule failed:', error)
    return { ok: false, skipped: false, message: '通知の送信に失敗しました（通信エラー）' }
  }
}

/** そのワークショップで通知済みの日程キー一覧を取得する */
export async function fetchNotifiedScheduleKeys(workshopId: string): Promise<Set<string>> {
  try {
    const response = await fetch(`/api/push/notify-workshop?workshopId=${encodeURIComponent(workshopId)}`)
    if (!response.ok) return new Set()
    const data = await response.json()
    const keys = (data.notified || [])
      .map((row: { dedupe_key: string | null }) => row.dedupe_key)
      .filter((key: string | null): key is string => !!key)
    return new Set<string>(keys)
  } catch {
    return new Set()
  }
}
