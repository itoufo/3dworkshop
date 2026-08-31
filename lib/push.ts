import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Web Push（PWA 通知）のサーバー側処理。
// API ルートからのみ import すること（service role キーを使うため）。

/**
 * 配信の宛先を絞る区分。push_subscriptions.topics に入っている購読者だけに届く。
 *
 * ⚠ この列を「あるだけで誰も読まない」状態にしない。読まないなら、
 *   フッターの「新しい開催日程が追加されたときだけお届けします」が嘘になる
 *   （管理画面の手動配信が同じ全員に飛ぶため。2026-08-31 のレビューで指摘）。
 */
export type PushTopic = 'workshop_schedule' | 'announcement'

/** 1回の fetch で扱う購読数。⚠ 全件を一度に並列で投げない（下の sendPushToAll のコメント） */
const SEND_BATCH_SIZE = 50

export interface PushPayload {
  title: string
  body: string
  /** 通知タップ時に開くパス。'/workshops/xxx' のようなサイト内パス */
  url?: string
  /** 同じ tag の通知は端末上で上書きされる（同一日程の再送で通知が積み上がらない） */
  tag?: string
}

export interface PushSendResult {
  /** 実際に配信できた購読数 */
  sent: number
  /** 一時的な失敗（次回また試す） */
  failed: number
  /** 購読が失効していたので削除した数 */
  removed: number
  /** 送信を試みた時点での有効な購読数 */
  total: number
}

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:y-sato@sunu25.com'

/**
 * VAPID キーが揃っているか。未設定なら通知機能は無効（サイト自体は動く）。
 */
export function isPushConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) {
    throw new Error(
      'VAPID キーが未設定です。NEXT_PUBLIC_VAPID_PUBLIC_KEY と VAPID_PRIVATE_KEY を環境変数に設定してください。'
    )
  }
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey)
}

/**
 * 有効な購読すべてに通知を送る。
 *
 * 失効した購読（410 Gone / 404 Not Found）は、その場でテーブルから削除する。
 * それ以外のエラーは failure_count を増やすだけにして、次回また試す。
 */
export async function sendPushToAll(payload: PushPayload, topic: PushTopic): Promise<PushSendResult> {
  const db = supabaseAdmin
  if (!db) throw new Error('supabaseAdmin is unavailable')
  configureWebPush()

  // ⚠ topic で必ず絞る。絞らないと、日程通知だけに同意した人へお知らせが飛ぶ
  const { data: subscriptions, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('is_active', true)
    .contains('topics', [topic])

  if (error) throw new Error(`購読一覧の取得に失敗しました: ${error.message}`)

  const targets = subscriptions || []
  if (targets.length === 0) {
    return { sent: 0, failed: 0, removed: 0, total: 0 }
  }

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/workshops',
    tag: payload.tag,
  })

  const staleIds: string[] = []
  const failedIds: string[] = []
  const sentIds: string[] = []

  // ⚠ 全件を一度に Promise.allSettled へ投げない。購読が数百になると、
  //   1リクエストの中で数百本の外向き HTTPS が同時に走り、関数の実行時間上限に当たる。
  //   途中で切られると「一部の端末には届いたのに、送信は失敗と表示される」状態になり、
  //   管理者が再送して二重に届く（2026-08-31 のレビューで指摘）。
  //   小分けにして、1回ぶんの上限を読めるようにする。
  for (let i = 0; i < targets.length; i += SEND_BATCH_SIZE) {
    const batch = targets.slice(i, i + SEND_BATCH_SIZE)
    const results = await Promise.allSettled(
      batch.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 * 24 * 3 } // 3日以内に端末が起動すれば届く
        )
      )
    )

    results.forEach((result, j) => {
      const sub = batch[j]
      if (result.status === 'fulfilled') {
        sentIds.push(sub.id)
        return
      }
      const statusCode = (result.reason as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        // 購読が失効している（通知を切った・ブラウザを消した等）
        staleIds.push(sub.id)
      } else {
        console.error('push send failed:', sub.endpoint.slice(0, 60), statusCode, result.reason)
        failedIds.push(sub.id)
      }
    })
  }

  if (staleIds.length > 0) {
    await db.from('push_subscriptions').delete().in('id', staleIds)
  }
  if (sentIds.length > 0) {
    await db
      .from('push_subscriptions')
      .update({ last_notified_at: new Date().toISOString(), failure_count: 0 })
      .in('id', sentIds)
  }
  if (failedIds.length > 0) {
    // 一時的な失敗。後から追えるようにカウントだけ上げる（配信は次回また試す）
    const { data: rows } = await db
      .from('push_subscriptions')
      .select('id, failure_count')
      .in('id', failedIds)
    await Promise.all(
      (rows || []).map((row) =>
        db
          .from('push_subscriptions')
          .update({ failure_count: (row.failure_count || 0) + 1 })
          .eq('id', row.id)
      )
    )
  }

  return {
    sent: sentIds.length,
    failed: failedIds.length,
    removed: staleIds.length,
    total: targets.length,
  }
}

/**
 * 通知を送って履歴に残す。
 *
 * dedupeKey を渡すと、同じキーでは1回しか送らない。
 * 日程追加の通知で、保存操作を繰り返しても同じ日程の通知が何度も飛ばないようにするため。
 *
 * ⚠ 履歴の行は「送る前」に入れる。ここが重複防止の実体で、
 *   dedupe_key の UNIQUE 制約が同時実行に対する唯一の鍵になる。
 *   送ってから入れると、同時に来た2本が両方とも「まだ無い」を読んで両方送り、
 *   2本目の insert だけが弾かれる。しかもそのエラーを捨てていたので、
 *   全員に同じ通知が2回届いていた（2026-08-31 のレビューで指摘）。
 *   件数は送信後に更新する。
 */
export async function sendAndLogPush(params: {
  kind: 'workshop_schedule' | 'manual'
  payload: PushPayload
  topic: PushTopic
  workshopId?: string | null
  dedupeKey?: string | null
  /**
   * 送らずに履歴だけ残す（限定公開のワークショップなど）。
   * ⚠ 「送らない」と「記録しない」を混ぜないこと。記録しないと管理画面が
   *   ずっと「未通知」を出し続け、押しても何も起きないボタンが残る。
   */
  logOnly?: boolean
}): Promise<PushSendResult & { skipped: boolean }> {
  const db = supabaseAdmin
  if (!db) throw new Error('supabaseAdmin is unavailable')

  const empty = { sent: 0, failed: 0, removed: 0, total: 0 }

  // 先に履歴を作って dedupe_key を確保する
  const { data: logRow, error: insertError } = await db
    .from('push_notification_log')
    .insert({
      kind: params.kind,
      workshop_id: params.workshopId || null,
      dedupe_key: params.dedupeKey || null,
      title: params.payload.title,
      body: params.payload.body,
      url: params.payload.url || null,
      sent_count: 0,
      failed_count: 0,
    })
    .select('id')
    .single()

  if (insertError) {
    // 23505 = UNIQUE 違反。同じ dedupe_key が既にある＝送信済み
    if (insertError.code === '23505') {
      return { ...empty, skipped: true }
    }
    throw new Error(`通知履歴の記録に失敗しました: ${insertError.message}`)
  }

  if (params.logOnly) {
    return { ...empty, skipped: true }
  }

  let result: PushSendResult
  try {
    result = await sendPushToAll(params.payload, params.topic)
  } catch (error) {
    // 確保した履歴を取り消して、直してから再試行できるようにする。
    //
    // ⚠ これが成立するのは、sendPushToAll が投げるのが「1通も送る前」に限られるから
    //   （VAPID キー未設定と、購読一覧の取得失敗の2つ。個々の送信失敗は allSettled が
    //   受け止めるので投げない）。送信を始めたあとに投げうる処理をこの関数に足すなら、
    //   ここも一緒に見直すこと。取り消したまま再送すると、届いた人に二重に届く。
    await db.from('push_notification_log').delete().eq('id', logRow.id)
    throw error
  }

  const { error: updateError } = await db
    .from('push_notification_log')
    .update({ sent_count: result.sent, failed_count: result.failed })
    .eq('id', logRow.id)

  // 件数の更新に失敗しても配信自体は済んでいる。履歴の数字がずれるだけなので落とさない
  if (updateError) {
    console.error('push log update failed:', logRow.id, updateError.message)
  }

  return { ...result, skipped: false }
}
