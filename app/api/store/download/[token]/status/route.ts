import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_DOWNLOAD_MAX_COUNT } from '@/lib/store/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ダウンロードページに出す情報（作品名・あと何回か）。数えない */
export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const headers = { 'Cache-Control': 'no-store' }
  const { token } = await context.params
  if (!supabaseAdmin || !/^[A-Za-z0-9_-]{40,}$/.test(token)) {
    return NextResponse.json({ available: false, reason: 'invalid' }, { status: 404, headers })
  }
  const { data } = await supabaseAdmin
    .from('store_orders')
    .select('kind, status, download_count, download_expires_at, product:store_products(title)')
    .eq('download_token', token)
    .maybeSingle()
  if (!data || data.kind !== 'data') {
    return NextResponse.json({ available: false, reason: 'invalid' }, { status: 404, headers })
  }
  const product = (Array.isArray(data.product) ? data.product[0] : data.product) as { title: string } | null
  const remaining = Math.max(0, STORE_DOWNLOAD_MAX_COUNT - data.download_count)
  const expired = !data.download_expires_at || new Date(data.download_expires_at) < new Date()
  const reason = data.status !== 'paid' ? 'not_paid' : expired ? 'expired' : remaining === 0 ? 'used_up' : null
  return NextResponse.json({ available: !reason, reason, title: product?.title ?? '作品', remaining }, { headers })
}
