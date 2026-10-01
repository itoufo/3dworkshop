import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 公開中の作品・出品者を読む（作品ページ・出品者ページ・決済で共通）。
 * ⚠ 「作品が published」かつ「出品者が approved」のものだけ。停止・却下された出品者の作品は、
 *   トップから消えても URL を知っていれば開ける・買える、にならないようにここで必ず絞る。
 */

export interface PublicProduct {
  id: string
  title: string
  description: string | null
  image_urls: string[]
  sell_data: boolean
  data_price: number | null
  data_file_name: string | null
  sell_print: boolean
  print_price: number | null
  print_spec: string | null
  published_at: string | null
  updated_at: string
  seller: { id: string; display_name: string; slug: string; bio: string | null; avatar_url: string | null }
}

const PRODUCT_COLUMNS =
  'id, title, description, image_urls, sell_data, data_price, data_file_name, sell_print, print_price, print_spec, published_at, updated_at, seller:store_sellers!inner(id, display_name, slug, bio, avatar_url, status)'

export async function getPublicProduct(id: string): Promise<PublicProduct | null> {
  if (!supabaseAdmin || !/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data, error } = await supabaseAdmin
    .from('store_products')
    .select(PRODUCT_COLUMNS)
    .eq('id', id)
    .eq('status', 'published')
    .eq('seller.status', 'approved')
    .maybeSingle()
  if (error) {
    console.error('[store] product', id, error.message)
    return null
  }
  return (data as unknown as PublicProduct) ?? null
}

export interface PublicSeller {
  id: string
  display_name: string
  slug: string
  bio: string | null
  avatar_url: string | null
}

export async function getPublicSeller(slug: string): Promise<{ seller: PublicSeller; products: PublicProduct[] } | null> {
  if (!supabaseAdmin) return null
  const { data: seller } = await supabaseAdmin
    .from('store_sellers')
    .select('id, display_name, slug, bio, avatar_url')
    .eq('slug', slug)
    .eq('status', 'approved')
    .maybeSingle()
  if (!seller) return null
  const { data: products } = await supabaseAdmin
    .from('store_products')
    .select(PRODUCT_COLUMNS)
    .eq('seller_id', seller.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  return { seller: seller as PublicSeller, products: (products ?? []) as unknown as PublicProduct[] }
}

/** いいねの数（作品ごと） */
export async function likeCounts(productIds: string[]): Promise<Record<string, number>> {
  if (!supabaseAdmin || productIds.length === 0) return {}
  const { data } = await supabaseAdmin.from('store_product_likes').select('product_id').in('product_id', productIds)
  const counts: Record<string, number> = {}
  for (const row of data ?? []) counts[row.product_id] = (counts[row.product_id] ?? 0) + 1
  return counts
}

/** この人がいいねしているか */
export async function hasLiked(productId: string, miraiidUserId: string): Promise<boolean> {
  if (!supabaseAdmin) return false
  const { data } = await supabaseAdmin
    .from('store_product_likes')
    .select('product_id')
    .eq('product_id', productId)
    .eq('miraiid_user_id', miraiidUserId)
    .maybeSingle()
  return Boolean(data)
}
