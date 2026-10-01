import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { handleAdminDelete } from '@/lib/admin-delete'
import { parseSeriesInput } from '@/lib/product-series-input'

/** 物販シリーズ1件の取得・更新・削除。⚠ どれも先頭で requireAdmin() を通す */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params

  const { data, error } = await supabaseAdmin!.from('product_series').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('[admin/product-series] get', error.code, error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }
  if (!data) return Response.json({ error: 'not_found', message: 'シリーズが見つかりません' }, { status: 404 })
  return Response.json({ series: data })
}

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params

  const parsed = parseSeriesInput(await req.json().catch(() => null))
  if (!parsed.ok) return Response.json({ error: 'bad_request', message: parsed.message }, { status: 400 })

  const { data, error } = await supabaseAdmin!
    .from('product_series')
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle()
  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'conflict', message: 'その URL 用の名前（slug）は使われています' }, { status: 409 })
    }
    console.error('[admin/product-series] update', error.code, error.message)
    return Response.json({ error: 'db_error', message: error.message }, { status: 500 })
  }
  if (!data) return Response.json({ error: 'not_found', message: 'シリーズが見つかりません' }, { status: 404 })

  // 項目名を変えると、子商品に入っている値（古い項目名のもの）とつながらなくなる。
  // 止めはしない（商品側を直すには先にシリーズの項目が要る）が、何件直す必要があるかを返す
  const { data: items } = await supabaseAdmin!
    .from('products')
    .select('variant_options')
    .eq('series_id', id)
  const incomplete = (items ?? []).filter((item) =>
    parsed.value.option_axes.some((axis) => !(item.variant_options as Record<string, string> | null)?.[axis])
  ).length

  return Response.json({ series: data, incomplete_items: incomplete })
}

// シリーズを消しても子商品は消えない（products.series_id は ON DELETE SET NULL）。単品に戻る
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params
  return handleAdminDelete('product_series', id)
}
