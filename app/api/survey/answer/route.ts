import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'

// アンケートの投票。
// survey_answers は RLS で匿名キーを締め出しているので、投票は必ずこのルートを通す。

export const runtime = 'nodejs'

/**
 * 1接続元あたりの上限。
 *
 * ⚠ これは不正投票の防止ではない。1端末1票は DB の UNIQUE(survey_id, device_id) が担保していて、
 *   ここは「device_id を作り直しながら連打する」だけを鈍らせるための枠。
 *   学校や職場のように出口 IP を共有する環境があるので、きつくしすぎない。
 */
const WINDOW_MS = 10 * 60 * 1000
const MAX_ANSWERS = 20

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const ip = clientIp(request.headers)
    if (await tooManyRequests(`survey-answer:${ip}`, { windowMs: WINDOW_MS, max: MAX_ANSWERS })) {
      return NextResponse.json(
        { error: 'しばらく時間をおいてからお試しください' },
        { status: 429 }
      )
    }

    // ⚠ 本文の読み取りは個別に受ける。まとめて外側の catch に落とすと、
    //   壊れた JSON が 500 になり「サーバー側の不具合」に見える
    let body: { surveyId?: unknown; deviceId?: unknown; choice?: unknown }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    const { surveyId, deviceId, choice } = body

    if (typeof surveyId !== 'string' || !UUID_RE.test(surveyId)) {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    // ⚠ 形式を必ず見る。UUID 以外を渡すと RPC が型エラーで 500 を返し、
    //   利用者には原因の分からないエラーになる
    if (typeof deviceId !== 'string' || !UUID_RE.test(deviceId)) {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    if (choice !== 'a' && choice !== 'b') {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('submit_survey_answer', {
      p_survey_id: surveyId,
      p_device_id: deviceId,
      p_choice: choice,
    })

    if (error) {
      // RPC が投げる想定内の状態。利用者に見せる文言に置き換える
      if (error.message.includes('survey is not open')) {
        return NextResponse.json(
          { error: 'この質問は受付を終了しました' },
          { status: 409 }
        )
      }
      if (error.message.includes('survey not found')) {
        return NextResponse.json({ error: '質問が見つかりません' }, { status: 404 })
      }
      console.error('survey answer failed:', error.code, error.message)
      return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
    }

    // RETURNS TABLE なので配列で返る
    const row = Array.isArray(data) ? data[0] : data
    if (!row) {
      console.error('survey answer returned no row:', surveyId)
      return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      countA: row.count_a as number,
      countB: row.count_b as number,
      /** すでに投票済みだった（票は増えていない） */
      already: row.already as boolean,
    })
  } catch (error) {
    console.error('survey answer error:', error)
    return NextResponse.json({ error: '回答の保存に失敗しました' }, { status: 500 })
  }
}
