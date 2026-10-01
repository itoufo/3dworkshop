import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_FILES_BUCKET } from '@/lib/store/storage'

/**
 * 注文を印刷するためにデータを取り出す。60秒だけ有効な URL へ飛ばす。requireAdmin() 必須。
 * ⚠ 作品の今のファイルではなく、買った時点のファイル（注文に写したもの）を使う。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { data: order } = await supabaseAdmin!
    .from('store_orders')
    .select('data_file_path, data_file_name')
    .eq('id', id)
    .maybeSingle()
  if (!order?.data_file_path) return NextResponse.json({ error: 'データがありません' }, { status: 404 })

  // ファイル名は出品者が付けたもの。ヘッダを壊す文字を落とす
  const fileName = order.data_file_name ? order.data_file_name.replace(/[\\/:*?"<>|\r\n]/g, '_') : true
  const { data, error } = await supabaseAdmin!.storage
    .from(STORE_FILES_BUCKET)
    .createSignedUrl(order.data_file_path, 60, { download: fileName })
  if (error || !data) return NextResponse.json({ error: 'データを取り出せませんでした' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
