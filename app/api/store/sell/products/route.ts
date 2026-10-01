import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireApprovedSeller } from '@/lib/store/session'
import { isSameOriginJson } from '@/lib/store/request'
import { parseProductInput } from '@/lib/store/product-input'

/** 作品を下書きで作る。POST { title, ... } → { id } */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireApprovedSeller()
  if ('denied' in auth) return auth.denied
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const parsed = parseProductInput(auth.user.seller.id, body ?? {})
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('store_products')
    .insert({ ...parsed.values, seller_id: auth.user.seller.id, status: 'draft' })
    .select('id')
    .single()
  if (error || !data) {
    console.error('[store/products] insert failed:', error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ id: data.id })
}
