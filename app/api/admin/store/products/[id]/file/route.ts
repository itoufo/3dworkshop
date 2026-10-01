import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_FILES_BUCKET } from '@/lib/store/storage'

/** 審査・印刷のために出品データを取り出す。60秒だけ有効な URL へ飛ばす。requireAdmin() 必須 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const { data: product } = await supabaseAdmin!
    .from('store_products')
    .select('data_file_path, data_file_name')
    .eq('id', id)
    .maybeSingle()
  if (!product?.data_file_path) return NextResponse.json({ error: 'データがありません' }, { status: 404 })

  const { data, error } = await supabaseAdmin!.storage
    .from(STORE_FILES_BUCKET)
    .createSignedUrl(product.data_file_path, 60, { download: product.data_file_name || true })
  if (error || !data) return NextResponse.json({ error: 'データを取り出せませんでした' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
