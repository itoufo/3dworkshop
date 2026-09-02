import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CUTTER_BUCKET } from '@/lib/cookie-cutter/server'

/**
 * 印刷して発送する注文のために、こちらで STL を取り出す。
 *
 * お客様用のリンク（/api/cookie-cutter/download/[token]）とは分けてある。
 * あちらは回数を数えて上限で止めるため、こちらから使うとお客様の残り回数を削ってしまう。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await context.params
  const { data: order, error } = await supabaseAdmin!
    .from('cutter_orders')
    .select('id, stl_path, design:cutter_designs(title)')
    .eq('id', id)
    .single()

  if (error || !order?.stl_path) {
    return NextResponse.json({ error: 'データがありません' }, { status: 404 })
  }

  const { data: file, error: downloadError } = await supabaseAdmin!.storage
    .from(CUTTER_BUCKET)
    .download(order.stl_path)

  if (downloadError || !file) {
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
  }

  const design = Array.isArray(order.design) ? order.design[0] : order.design
  const utf8Name = encodeURIComponent(`${String(design?.title || 'cookie-cutter').replace(/[\\/:*?"<>|]/g, '_')}.stl`)

  return new NextResponse(await file.arrayBuffer(), {
    headers: {
      'Content-Type': 'model/stl',
      'Content-Disposition': `attachment; filename="cutter-${id.slice(0, 8)}.stl"; filename*=UTF-8''${utf8Name}`,
      'Cache-Control': 'no-store',
    },
  })
}
