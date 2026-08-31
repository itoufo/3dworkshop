import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { isAllowedEndpoint, type PushTopic } from '@/lib/push'

// 既に購読している端末の配信区分を出し入れする。
//
// 「毎日のアンケート」は購読時の既定に入れていない（app/api/push/subscribe のコメント参照）。
// 別の合意として、/survey の切り替えからここを呼んで足してもらう。

export const runtime = 'nodejs'

/**
 * ここから足し引きしてよい区分。
 *
 * ⚠ 'workshop_schedule' を入れないこと。開催日程の通知は購読の前提そのもので、
 *   これを外せるようにすると「通知はオンなのに何も来ない」状態を作れてしまう。
 *   通知そのものを止めたい人は購読解除（/api/push/unsubscribe）へ誘導する。
 */
const TOGGLEABLE_TOPICS: PushTopic[] = ['daily_survey']

const WINDOW_MS = 10 * 60 * 1000
const MAX_CHANGES = 20

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const ip = clientIp(request.headers)
    if (await tooManyRequests(`push-topics:${ip}`, { windowMs: WINDOW_MS, max: MAX_CHANGES })) {
      return NextResponse.json({ error: 'しばらく時間をおいてからお試しください' }, { status: 429 })
    }

    const { endpoint, topic, enabled } = (await request.json()) as {
      endpoint?: unknown
      topic?: unknown
      enabled?: unknown
    }

    if (typeof endpoint !== 'string' || !isAllowedEndpoint(endpoint)) {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    if (typeof topic !== 'string' || !TOGGLEABLE_TOPICS.includes(topic as PushTopic)) {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }

    const { data: row, error: selectError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, topics')
      .eq('endpoint', endpoint)
      .maybeSingle()

    if (selectError) {
      console.error('push topics select failed:', selectError.message)
      return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 })
    }
    if (!row) {
      // 端末側は購読済みのつもりでも、サーバーには無い（購読解除後など）。
      // ⚠ ここで勝手に行を作らない。p256dh / auth が無いので配信できない行になる。
      //   呼び出し側に「購読からやり直す」を促させる
      return NextResponse.json({ error: 'not_subscribed' }, { status: 404 })
    }

    const current: string[] = row.topics || []
    const next = enabled
      ? Array.from(new Set([...current, topic]))
      : current.filter((t) => t !== topic)

    const { error: updateError } = await supabaseAdmin
      .from('push_subscriptions')
      .update({ topics: next })
      .eq('id', row.id)

    if (updateError) {
      console.error('push topics update failed:', updateError.message)
      return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, topics: next })
  } catch (error) {
    console.error('push topics error:', error)
    return NextResponse.json({ error: '設定の保存に失敗しました' }, { status: 500 })
  }
}

/** この端末が今どの区分を受け取る設定になっているか */
export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const endpoint = request.nextUrl.searchParams.get('endpoint')
  if (!endpoint || !isAllowedEndpoint(endpoint)) {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const { data } = await supabaseAdmin
    .from('push_subscriptions')
    .select('topics')
    .eq('endpoint', endpoint)
    .maybeSingle()

  return NextResponse.json({ topics: data?.topics || null })
}
