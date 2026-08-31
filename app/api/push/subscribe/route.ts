import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { isAllowedEndpoint, type PushTopic } from '@/lib/push'

// ブラウザの購読情報を保存する。
// push_subscriptions は RLS で匿名キーを締め出しているので、
// 登録は必ずこの service role 経由のルートを通す。

export const runtime = 'nodejs'

/**
 * 登録できる配信区分。
 * ⚠ クライアントに選ばせない。ここでサーバーが決める。
 *   画面の文言（PushSubscribeButton）と、この配列を必ず揃えること。
 *
 * ⚠ 'daily_survey' をここに足さないこと。来訪時のプロンプトで許可した人は
 *   「新しい開催日程」の約束で許可している。毎日届く通知は /survey の切り替えから
 *   明示的に足してもらう（app/api/push/topics）。
 */
const SUBSCRIBE_TOPICS: PushTopic[] = ['workshop_schedule', 'announcement']

/** 1つの接続元から短時間に大量登録されないようにする */
const WINDOW_MS = 10 * 60 * 1000
const MAX_SUBSCRIBES = 10

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const ip = clientIp(request.headers)
    if (await tooManyRequests(`push-subscribe:${ip}`, { windowMs: WINDOW_MS, max: MAX_SUBSCRIBES })) {
      return NextResponse.json(
        { error: 'しばらく時間をおいてからお試しください' },
        { status: 429 }
      )
    }

    const { subscription } = await request.json()

    const endpoint: unknown = subscription?.endpoint
    const p256dh: unknown = subscription?.keys?.p256dh
    const auth: unknown = subscription?.keys?.auth

    if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
      return NextResponse.json({ error: '購読情報の形式が不正です' }, { status: 400 })
    }
    if (!isAllowedEndpoint(endpoint)) {
      console.warn('push subscribe rejected (endpoint host):', endpoint.slice(0, 80))
      return NextResponse.json({ error: '購読情報の形式が不正です' }, { status: 400 })
    }
    // 鍵の長さもざっと見る。ブラウザが出す値は p256dh が 87〜88 字、auth が 22〜24 字
    if (p256dh.length < 80 || p256dh.length > 200 || auth.length < 16 || auth.length > 100) {
      return NextResponse.json({ error: '購読情報の形式が不正です' }, { status: 400 })
    }

    // ⚠ 再登録で topics を SUBSCRIBE_TOPICS に上書きしないこと。
    //   このルートは sw.js の pushsubscriptionchange や PushAutoPrompt からも呼ばれる。
    //   上書きすると、/survey で明示的に足してもらった 'daily_survey' が
    //   本人の知らないうちに外れ、翌日から通知が止まる（本人には「オン」に見えたまま）。
    //   既定は足しつつ、既に持っている区分は残す＝和集合にする。
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('topics')
      .eq('endpoint', endpoint)
      .maybeSingle()

    const topics = Array.from(
      new Set([...(existing?.topics || []), ...SUBSCRIBE_TOPICS])
    )

    // ⚠ upsert なので、同じ endpoint での再登録は既存行を上書きする。
    //   endpoint は本人のブラウザしか知り得ない値なので鍵として成立するが、
    //   万一漏れた場合に他人の鍵を書き換えられるのは避けられない。
    //   （書き換えられても届かなくなるだけで、他人宛の通知は読めない）
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh,
        auth,
        topics,
        user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
        is_active: true,
        failure_count: 0,
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      console.error('push subscribe failed:', error)
      return NextResponse.json({ error: '購読の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('push subscribe error:', error)
    return NextResponse.json({ error: '購読に失敗しました' }, { status: 500 })
  }
}
