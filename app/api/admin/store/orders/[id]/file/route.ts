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
    .select('data_file_path, data_file_name, product:store_products(data_file_path, data_file_name)')
    .eq('id', id)
    .maybeSingle()
  const product = (Array.isArray(order?.product) ? order?.product[0] : order?.product) as
    | { data_file_path: string | null; data_file_name: string | null }
    | null
    | undefined
  const path = order?.data_file_path ?? product?.data_file_path
  if (!path) return NextResponse.json({ error: 'データがありません' }, { status: 404 })

  const { data, error } = await supabaseAdmin!.storage
    .from(STORE_FILES_BUCKET)
    .createSignedUrl(path, 60, { download: order?.data_file_name || product?.data_file_name || true })
  if (error || !data) return NextResponse.json({ error: 'データを取り出せませんでした' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
