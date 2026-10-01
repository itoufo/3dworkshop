import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { parseSeriesInput } from '@/lib/product-series-input'

/**
 * 物販シリーズの一覧（非公開も含む）と作成。
 *
 * ⚠ 先頭で requireAdmin() を通す。product_series は anon では公開中しか読めず、
 *   書き込みもできない（20261001_create_product_series.sql）。管理画面はこの口を使う。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function dbError(scope: string, error: { code?: string; message: string }) {
  console.error(`[admin/product-series] ${scope}`, error.code, error.message)
  const missing = error.code === '42P01' || error.code === 'PGRST205'
  return Response.json(
    {
      error: 'db_error',
      message: missing
        ? 'シリーズ用のテーブルがありません。migration 20261001_create_product_series.sql を適用してください。'
        : error.message,
    },
    { status: 500 },
  )
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data: series, error } = await supabaseAdmin!
    .from('product_series')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return dbError('list', error)

  // 子商品の数（公開中 / 全部）を一覧に出す
  const { data: items, error: itemsError } = await supabaseAdmin!
    .from('products')
    .select('series_id, is_active')
    .not('series_id', 'is', null)
  if (itemsError) return dbError('items', itemsError)

  const counts = new Map<string, { total: number; active: number }>()
  for (const item of items ?? []) {
    const c = counts.get(item.series_id) ?? { total: 0, active: 0 }
    c.total += 1
    if (item.is_active) c.active += 1
    counts.set(item.series_id, c)
  }

  return Response.json({
    series: (series ?? []).map((s) => ({
      ...s,
      item_count: counts.get(s.id)?.total ?? 0,
      active_item_count: counts.get(s.id)?.active ?? 0,
    })),
  })
}

export async function POST(req: Request) {
  const denied = await requireAdmin()
  if (denied) return denied

  const parsed = parseSeriesInput(await req.json().catch(() => null))
  if (!parsed.ok) return Response.json({ error: 'bad_request', message: parsed.message }, { status: 400 })

  const { data, error } = await supabaseAdmin!.from('product_series').insert(parsed.value).select('*').single()
  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'conflict', message: 'その URL 用の名前（slug）は使われています' }, { status: 409 })
    }
    return dbError('create', error)
  }
  return Response.json({ series: data }, { status: 201 })
}
