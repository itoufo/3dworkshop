import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { sanitizeParams } from '@/lib/cookie-cutter/params'
import { parseContours, generateStl, InvalidContourError } from '@/lib/cookie-cutter/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 10 * 60 * 1000
const MAX_SAVES = 40

/**
 * 作った型の設計を保存する。ここではまだ課金しない。
 *
 * 保存の時点でサーバー側でも組み立てを試し、立体として成立しない形は受け付けない。
 * 決済してから「作れませんでした」となるのを防ぐため。
 */
export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // ⚠ 接続元は名乗られた値ではなく CDN が付けたヘッダから取る（lib/rate-limit.ts）
  const ip = clientIp(request.headers)
  if (await tooManyRequests(`cutter-design:${ip}`, { windowMs: WINDOW_MS, max: MAX_SAVES })) {
    return NextResponse.json({ error: '保存の回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  let body: { contour?: unknown; params?: unknown; title?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  try {
    const contours = parseContours(body.contour)
    const params = sanitizeParams(body.params)
    // 立体として成立するかをサーバー側でも確かめる（ファイルは捨てる）
    const built = generateStl(contours, params)

    const title = typeof body.title === 'string' ? body.title.slice(0, 60) : null

    const { data, error } = await supabaseAdmin
      .from('cutter_designs')
      .insert({
        title,
        contour: contours,
        params,
        size_mm: built.size,
        volume_cm3: built.volumeCm3,
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('cutter_designs insert failed:', error)
      return NextResponse.json({ error: '設計の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      size: built.size,
      volumeCm3: built.volumeCm3,
      triangleCount: built.triangleCount,
    })
  } catch (err) {
    if (err instanceof InvalidContourError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('cutter design save error:', err)
    return NextResponse.json({ error: '設計の保存に失敗しました' }, { status: 500 })
  }
}
