import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { StoreTopProduct } from '@/components/store/StoreTop'

/** トップページ（/ と /en）に並べる公開中の作品。新しい順に60件まで */
export async function publishedProducts(): Promise<StoreTopProduct[]> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from('store_products')
    // ⚠ 出品者が承認済みのものだけ。停止・却下された出品者の作品を出さない
    .select('id, title, image_urls, sell_data, data_price, sell_print, print_price, print_variants, store_sellers!inner(display_name, slug)')
    .eq('status', 'published')
    .eq('store_sellers.status', 'approved')
    .order('published_at', { ascending: false })
    .limit(60)
  if (error) {
    console.error('[store] product list failed:', error)
    return []
  }
  return (data ?? []) as unknown as StoreTopProduct[]
}

/**
 * 「買い方は2つ」に出す最安値（データ・完成品それぞれ）。
 * ⚠ 上の一覧（新しい順60件）から出さない。作品が60件を超えると、古くて安い作品が
 *   一覧から外れ、実際より高い「〜から」を出してしまう。
 * ⚠ 絞り方は一覧と同じ（公開中の作品 かつ 承認済みの出品者）。読めなければ null（金額を出さない）。
 */
export async function lowestStorePrices(): Promise<{ data: number | null; print: number | null }> {
  if (!supabaseAdmin) return { data: null, print: null }
  const admin = supabaseAdmin
  const lowest = async (sellColumn: 'sell_data' | 'sell_print', priceColumn: 'data_price' | 'print_price') => {
    const { data, error } = await admin
      .from('store_products')
      .select(`${priceColumn}, store_sellers!inner(status)`)
      .eq('status', 'published')
      .eq('store_sellers.status', 'approved')
      .eq(sellColumn, true)
      .not(priceColumn, 'is', null)
      .order(priceColumn, { ascending: true })
      .limit(1)
    if (error) {
      console.error('[store] lowest price failed:', priceColumn, error.message)
      return null
    }
    const row = (data ?? [])[0] as Record<string, unknown> | undefined
    const price = row?.[priceColumn]
    return typeof price === 'number' ? price : null
  }
  const [data, print] = await Promise.all([lowest('sell_data', 'data_price'), lowest('sell_print', 'print_price')])
  return { data, print }
}
