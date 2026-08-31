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
  // ⚠ 日付の引き算はミリ秒で行い、JST に直してから文字列にする。
  //   today から1を引くような文字列操作をすると月初で壊れる
  const yesterday = jstDateString(new Date(Date.now() - 24 * 60 * 60 * 1000))

  try {
    // ---- 1. 今日のぶん以外で受付中のものを締める ----
    // ⚠ 「昨日より前」ではなく「今日ではない」で締める。publish_date が NULL や
    //   未来日付のまま live になっている行（管理画面から作れてしまう）が
    //   .lt(today) をすり抜けて永久に居座り、翌日に2本目が live になって
    //   /survey が古いほうを出し続ける状態になる。
    const { error: closeError } = await db
      .from('surveys')
      .update({ status: 'closed', finalized_at: new Date().toISOString() })
      .eq('status', 'live')
      .or(`publish_date.is.null,publish_date.neq.${today}`)

    if (closeError) {
      console.error('[daily-survey] close failed:', closeError.message)
      return NextResponse.json({ error: closeError.message }, { status: 500 })
    }

    // 通知で結果を知らせる対象は「昨日の日付の締切済み」に限る。
    // ⚠ 「直近の締切済み」で拾わない。在庫切れで1日空いた翌日に、
    //   2日前の設問を「昨日の結果」として送ってしまう。
    const { data: closedYesterday, error: yesterdayError } = await db
      .from('surveys')
      .select('slug, question')
      .eq('status', 'closed')
      .eq('publish_date', yesterday)
      .maybeSingle()

    if (yesterdayError) {
      console.error('[daily-survey] yesterday lookup failed:', yesterdayError.message)
      return NextResponse.json({ error: yesterdayError.message }, { status: 500 })
    }

    // ---- 2. 今日の設問を受付中にする ----
    // ⚠ 以降の SELECT / UPDATE は必ず error を見る。握りつぶすと、DB の一時障害が
    //   「在庫なし」として 200 で返り、ワークフローは成功扱いのまま通知だけ飛ばない。
    //   運用側には「設問を補充してください」としか見えず、障害に気づけない。
    const liveResult = await db
      .from('surveys')
      .select('id, slug, question, publish_date')
      .eq('status', 'live')
      .eq('publish_date', today)
      .maybeSingle()

    if (liveResult.error) {
      console.error('[daily-survey] live lookup failed:', liveResult.error.message)
      return NextResponse.json({ error: liveResult.error.message }, { status: 500 })
    }
    let live = liveResult.data

    if (!live) {
      // 公開日が今日に割り当て済みのストック
      const scheduled = await db
        .from('surveys')
        .update({ status: 'live' })
        .eq('status', 'scheduled')
        .eq('publish_date', today)
        .select('id, slug, question, publish_date')
        .maybeSingle()

      if (scheduled.error) {
        console.error('[daily-survey] scheduled promote failed:', scheduled.error.message)
        return NextResponse.json({ error: scheduled.error.message }, { status: 500 })
      }
      live = scheduled.data
    }

    if (!live) {
      // 日付未割当のストックから1問拾って今日に割り当てる
      const draft = await db
        .from('surveys')
        .select('id')
        .eq('status', 'draft')
        .is('publish_date', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (draft.error) {
        console.error('[daily-survey] draft lookup failed:', draft.error.message)
        return NextResponse.json({ error: draft.error.message }, { status: 500 })
      }

      if (draft.data) {
        // ⚠ publish_date は UNIQUE なので、同時実行の2本目はここで 23505 になる。
        //   その場合は既に誰かが今日の分を立てているので、読み直して続ける
        const promoted = await db
          .from('surveys')
          .update({ status: 'live', publish_date: today })
          .eq('id', draft.data.id)
          .eq('status', 'draft')
          .select('id, slug, question, publish_date')
          .maybeSingle()

        if (promoted.error && promoted.error.code !== '23505') {
          console.error('[daily-survey] promote failed:', promoted.error.message)
          return NextResponse.json({ error: promoted.error.message }, { status: 500 })
        }
        live = promoted.data || null

        if (!live) {
          const reread = await db
            .from('surveys')
            .select('id, slug, question, publish_date')
            .eq('publish_date', today)
            .maybeSingle()

          if (reread.error) {
            console.error('[daily-survey] reread failed:', reread.error.message)
            return NextResponse.json({ error: reread.error.message }, { status: 500 })
          }
          live = reread.data
        }
      }
    }

    if (!live) {
      // ⚠ 出す質問が無いのに通知しない。空の通知は解除の理由にしかならない。
      //   ここに来るのは本当に在庫が尽きたときだけ（上で error は全部 500 にした）
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
    const scheduleNotices = await db
      .from('push_notification_log')
      .select('id')
      .eq('kind', 'workshop_schedule')
      .gte('created_at', `${today}T00:00:00+09:00`)
      .limit(1)

    if (scheduleNotices.error) {
      console.error('[daily-survey] schedule notice lookup failed:', scheduleNotices.error.message)
      return NextResponse.json({ error: scheduleNotices.error.message }, { status: 500 })
    }
    const hasScheduleNotice = (scheduleNotices.data || []).length > 0

    const result = await sendAndLogPush({
      kind: 'daily_survey',
      topic: 'daily_survey',
      // 1日1回。遅延や手動再実行で2度走っても、ここで弾かれる
      dedupeKey: `survey:${today}`,
      logOnly: hasScheduleNotice,
      payload: {
        title: closedYesterday ? '昨日の結果が出ました' : '今日の質問が届きました',
        body: closedYesterday
          ? `「${closedYesterday.question}」の結果と、今日の質問をどうぞ`
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
      closedSlug: closedYesterday?.slug || null,
      skippedForSchedule: hasScheduleNotice,
      ...result,
    })
  } catch (error) {
    console.error('[daily-survey] error:', error)
    const message = error instanceof Error ? error.message : '日次処理に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
