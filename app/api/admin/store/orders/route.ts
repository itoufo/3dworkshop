import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** ストアの注文一覧。GET ?status=paid など（既定は決済待ち以外すべて）。requireAdmin() 必須 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'paid', 'shipped', 'cancelled', 'refunded']

export async function GET(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const status = request.nextUrl.searchParams.get('status')
  let query = supabaseAdmin!
    .from('store_orders')
    .select(`
      id, checkout_id, kind, quantity, variant_label, price, platform_fee, seller_amount, buyer_name, buyer_email, shipping, status,
      stripe_payment_intent_id, download_count, download_expires_at, tracking_number,
      paid_at, shipped_at, refunded_at, created_at, updated_at,
      data_file_name, product:store_products(id, title, data_file_name),
      seller:store_sellers(id, display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(300)
  if (status && STATUSES.includes(status)) query = query.eq('status', status)
  else query = query.neq('status', 'pending')

  const { data, error } = await query
  if (error) {
    console.error('[admin/store/orders] list failed:', error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ orders: data ?? [] })
}
