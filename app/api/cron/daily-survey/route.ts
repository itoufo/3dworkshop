import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isPushConfigured, sendAndLogPush } from '@/lib/push'
import { jstDateString } from '@/lib/surveys'

/**
 * 1日1回（JST 12:00）に呼ばれる。GitHub Actions の schedule から叩く。
 *
 *   1. 昨日までの受付中の設問を締めて確定させる
 *   2. 今日の設問を受付中にする
 *   3. 「昨日の結果が出ました＋今日の質問」を1通だけ配信する
 *
 * ⚠ 何度呼ばれても同じ結果になること。GitHub Actions の schedule は遅れることがあり、
 *   手動再実行（workflow_dispatch）もある。二重配信は push_notification_log の
 *   dedupe_key（UNIQUE）が受け止める。状態遷移のほうは条件付き UPDATE で冪等にする。
 */

export const runtime = 'nodejs'
// ⚠ 静的化させない。ビルド時に1回実行されて終わる
export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // 未設定なら誰も通さない（開けっ放しにしない）

  const provided = request.headers.get('x-cron-secret')
  if (!provided) return false

  // ⚠ === で比べない。文字列比較は先頭から順に見るので、掛かった時間で正解が漏れる
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(secret, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const db = supabaseAdmin
  if (!db) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const today = jstDateString()

  try {
    // ---- 1. 昨日までの受付中を締める ----
    // ⚠ 「昨日」を日付計算で出さない。運用が1日飛んだ場合に取り残しが出る。
    //   「今日より前で受付中のもの全部」を締める
    const { data: finalized, error: closeError } = await db
      .from('surveys')
      .update({ status: 'closed', finalized_at: new Date().toISOString() })
      .eq('status', 'live')
      .lt('publish_date', today)
      .select('id, slug, question, option_a, option_b, count_a, count_b, publish_date')

    if (closeError) {
      console.error('[daily-survey] close failed:', closeError.message)
      return NextResponse.json({ error: closeError.message }, { status: 500 })
    }

    // 直近で締めたもの＝通知で結果を知らせる対象。
    // 2回目以降の実行では上の UPDATE が0件になるので、DB から改めて引く
    let closedToday = (finalized || [])
      .sort((a, b) => (a.publish_date || '').localeCompare(b.publish_date || ''))
      .at(-1)

    if (!closedToday) {
      const { data } = await db
        .from('surveys')
        .select('id, slug, question, option_a, option_b, count_a, count_b, publish_date')
        .eq('status', 'closed')
        .lt('publish_date', today)
        .order('publish_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      closedToday = data || undefined
    }

    // ---- 2. 今日の設問を受付中にする ----
    let { data: live } = await db
      .from('surveys')
      .select('id, slug, question, publish_date')
      .eq('status', 'live')
      .eq('publish_date', today)
      .maybeSingle()

    if (!live) {
      // 公開日が今日に割り当て済みのストック
      const { data: scheduled } = await db
        .from('surveys')
        .update({ status: 'live' })
        .eq('status', 'scheduled')
        .eq('publish_date', today)
        .select('id, slug, question, publish_date')
        .maybeSingle()
      live = scheduled
    }

    if (!live) {
      // 日付未割当のストックから1問拾って今日に割り当てる。
      // ⚠ publish_date は UNIQUE なので、同時実行の2本目はここで 23505 になる。
      //   その場合は既に誰かが今日の分を立てているので、読み直して続ける
      const { data: draft } = await db
        .from('surveys')
        .select('id')
        .eq('status', 'draft')
        .is('publish_date', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (draft) {
        const { data: promoted, error: promoteError } = await db
          .from('surveys')
          .update({ status: 'live', publish_date: today })
          .eq('id', draft.id)
          .eq('status', 'draft')
          .select('id, slug, question, publish_date')
          .maybeSingle()

        if (promoteError && promoteError.code !== '23505') {
          console.error('[daily-survey] promote failed:', promoteError.message)
        }
        live = promoted || null

        if (!live) {
          const { data } = await db
            .from('surveys')
            .select('id, slug, question, publish_date')
            .eq('publish_date', today)
            .maybeSingle()
          live = data
        }
      }
    }

    if (!live) {
      // ⚠ 出す質問が無いのに通知しない。空の通知は解除の理由にしかならない
      console.warn('[daily-survey] ストックが尽きています。survey-generator を実行してください')
      return NextResponse.json({
        ok: true,
        date: today,
        sent: false,
        reason: 'no_stock',
        message: '公開できる設問がありません（draft のストックを補充してください）',
      })
    }

    if (!isPushConfigured()) {
      return NextResponse.json({
        ok: true,
        date: today,
        sent: false,
        reason: 'push_not_configured',
        liveSlug: live.slug,
      })
    }

    // ---- 3. 配信 ----
    // ⚠ 同じ日に開催日程の通知が出ていたら、アンケートは送らない。
    //   日程の通知は予約に直結する一方、アンケートは毎日出せる。同日に2通出すと
    //   価値の高いほうが埋もれ、通知そのものを切られる。記録だけ残して次の日に回す。
    const { data: scheduleNotices } = await db
      .from('push_notification_log')
      .select('id')
      .eq('kind', 'workshop_schedule')
      .gte('created_at', `${today}T00:00:00+09:00`)
      .limit(1)

    const hasScheduleNotice = (scheduleNotices || []).length > 0

    const result = await sendAndLogPush({
      kind: 'daily_survey',
      topic: 'daily_survey',
      // 1日1回。遅延や手動再実行で2度走っても、ここで弾かれる
      dedupeKey: `survey:${today}`,
      logOnly: hasScheduleNotice,
      payload: {
        title: closedToday ? '昨日の結果が出ました' : '今日の質問が届きました',
        body: closedToday
          ? `「${closedToday.question}」の結果と、今日の質問をどうぞ`
          : `「${live.question}」`,
        url: '/survey?from=push',
        // ⚠ 日ごとに違う tag にする。同じにすると、読まれる前に翌日の通知で上書きされる
        tag: `survey-${today}`,
      },
    })

    return NextResponse.json({
      ok: true,
      date: today,
      liveSlug: live.slug,
      closedSlug: closedToday?.slug || null,
      skippedForSchedule: hasScheduleNotice,
      ...result,
    })
  } catch (error) {
    console.error('[daily-survey] error:', error)
    const message = error instanceof Error ? error.message : '日次処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
