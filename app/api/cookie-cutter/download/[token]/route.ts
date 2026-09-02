import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CUTTER_BUCKET } from '@/lib/cookie-cutter/server'
import { DOWNLOAD_MAX_COUNT } from '@/lib/cookie-cutter/pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 購入済みの STL を渡す。
 *
 * ログインを作らないので、URL に入った合言葉が本人確認を兼ねる。
 * そのため必ず確かめること:
 *   - 支払いが済んでいるか
 *   - 期限が切れていないか
 *   - 回数の上限を超えていないか
 *
 * ⚠ バケットは非公開のままにし、公開URLを発行しないこと。
 *   公開URLを一度でも出すと、期限も回数も効かなくなる。
 */
export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { token } = await context.params
  if (!token || token.length < 20) {
    return NextResponse.json({ error: 'リンクが正しくありません' }, { status: 404 })
  }

  const { data: order, error } = await supabaseAdmin
    .from('cutter_orders')
    .select('id, payment_status, stl_path, download_count, download_expires_at, design:cutter_designs(title)')
    .eq('download_token', token)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'リンクが正しくありません' }, { status: 404 })
  }
  if (order.payment_status !== 'paid') {
    return NextResponse.json({ error: 'お支払いが確認できていません' }, { status: 403 })
  }
  if (!order.stl_path) {
    return NextResponse.json({ error: 'データの準備中です。数分後にもう一度お試しください' }, { status: 409 })
  }
  if (order.download_expires_at && new Date(order.download_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'ダウンロード期限が過ぎています。お手数ですがお問い合わせください' },
      { status: 410 }
    )
  }
  if ((order.download_count ?? 0) >= DOWNLOAD_MAX_COUNT) {
    return NextResponse.json(
      { error: 'ダウンロード回数の上限に達しました。お手数ですがお問い合わせください' },
      { status: 429 }
    )
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from(CUTTER_BUCKET)
    .download(order.stl_path)

  if (downloadError || !file) {
    console.error('cutter STL download failed:', downloadError)
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
  }

  await supabaseAdmin
    .from('cutter_orders')
    .update({ download_count: (order.download_count ?? 0) + 1 })
    .eq('id', order.id)

  const design = Array.isArray(order.design) ? order.design[0] : order.design
  const rawTitle = design?.title || 'cookie-cutter'
  // ファイル名に使えない文字と、ヘッダを壊す文字を落とす
  const asciiName = `cookie-cutter-${order.id.slice(0, 8)}.stl`
  const utf8Name = encodeURIComponent(`${String(rawTitle).replace(/[\\/:*?"<>|]/g, '_')}.stl`)

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      'Content-Type': 'model/stl',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      'Cache-Control': 'no-store',
    },
  })
}
