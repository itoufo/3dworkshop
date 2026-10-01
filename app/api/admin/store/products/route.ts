import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** ストアの作品一覧（審査用）。GET ?status=pending_review など。requireAdmin() 必須 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'archived']

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const status = request.nextUrl.searchParams.get('status')
  let query = supabaseAdmin!
    .from('store_products')
    .select(`
      id, title, description, image_urls, data_file_path, data_file_name,
      sell_data, data_price, sell_print, print_price, print_spec,
      status, review_note, submitted_at, published_at, updated_at,
      seller:store_sellers(id, display_name, slug, status)
    `)
    .order('updated_at', { ascending: false })
    .limit(300)
  if (status && STATUSES.includes(status)) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[admin/store/products] list failed:', error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ products: data ?? [] })
}
