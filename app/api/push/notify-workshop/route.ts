import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { isPushConfigured, sendAndLogPush } from '@/lib/push'
import {
  formatEventDateLabel,
  formatEventTimeShort,
  scheduleDedupeKey,
} from '@/lib/workshop-notification'

// 「開催日程を追加したら通知する」ための専用ルート。
//
// 通知文はサーバー側でワークショップ名と日時から組み立てる（クライアントの文字列は信用しない）。
// 同じ日程の通知は dedupe_key で1回だけに制限する。管理画面から再送する場合は force=true。

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'VAPID キーが未設定のため通知を送れません（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY）' },
      { status: 503 }
    )
  }

  try {
    const { workshopId, eventDate, eventTime, force } = await request.json()

    if (typeof workshopId !== 'string' || typeof eventDate !== 'string') {
      return NextResponse.json({ error: 'workshopId と eventDate が必要です' }, { status: 400 })
    }

    const { data: workshop, error } = await supabaseAdmin
      .from('workshops')
      .select('id, title, is_private')
      .eq('id', workshopId)
      .single()

    if (error || !workshop) {
      return NextResponse.json({ error: 'ワークショップが見つかりません' }, { status: 404 })
    }
    const time = formatEventTimeShort(eventTime)
    const dateLabel = formatEventDateLabel(eventDate)
    const title = '新しい開催日程が追加されました'
    const body = `${workshop.title}｜${dateLabel}${time ? ` ${time}〜` : ''}`

    const result = await sendAndLogPush({
      kind: 'workshop_schedule',
      topic: 'workshop_schedule',
      workshopId: workshop.id,
      dedupeKey: force ? null : scheduleDedupeKey(workshopId, eventDate, eventTime),
      // 限定公開のワークショップは URL を知っている人だけのものなので、全員には通知しない。
      // ⚠ ただし履歴は残す。残さないと管理画面がこの日程をいつまでも「未通知」と表示し、
      //   押しても何も起きないボタンが残る（2026-08-31 のレビューで指摘）
      logOnly: workshop.is_private,
      payload: {
        title,
        body,
        url: `/workshops/${workshop.id}`,
        tag: `workshop-${workshop.id}-${eventDate}`,
      },
    })

    if (workshop.is_private) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'private',
        message: '限定公開のワークショップのため通知は送信していません（通知済みとして記録しました）',
      })
    }

    return NextResponse.json({ success: true, title, body, ...result })
  } catch (error) {
    console.error('notify-workshop error:', error)
    const message = error instanceof Error ? error.message : '通知の送信に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** 指定ワークショップで通知済みの日程キー一覧。管理画面が「通知済み / 未通知」を表示するのに使う */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const workshopId = request.nextUrl.searchParams.get('workshopId')
  if (!workshopId) {
    return NextResponse.json({ error: 'workshopId が必要です' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('push_notification_log')
    .select('dedupe_key, created_at, sent_count')
    .eq('workshop_id', workshopId)
    .eq('kind', 'workshop_schedule')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notified: data || [] })
}
