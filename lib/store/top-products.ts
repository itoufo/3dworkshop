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
