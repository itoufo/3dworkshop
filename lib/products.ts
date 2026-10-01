import { createClient } from '@supabase/supabase-js'
import { isCompleteVariant } from '@/lib/product-variants'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * 開発サーバーでだけ、非公開のシリーズ・商品も表示する（登録した中身を公開前に見るため）。
 * `next start`（本番）では NODE_ENV が production なので、環境変数があっても効かない。
 */
const PREVIEW_INACTIVE =
  process.env.NODE_ENV !== 'production' && process.env.PRODUCTS_PREVIEW_INACTIVE === '1'

/** 非公開も読む必要があるときだけ service role。それ以外は公開用の anon */
async function readClient() {
  if (!PREVIEW_INACTIVE) return supabase
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  return supabaseAdmin ?? supabase
}

export interface Product {
  id: string
  name: string
  description: string
  category: string
  base_price: number
  /** 旧: 写真だけの配列。表示は media_urls を使う（残っているのは過去データ互換のため） */
  image_urls: string[]
  /** 写真と動画を表示順のまま並べた配列。先頭がメイン */
  media_urls: string[]
  specifications: Record<string, unknown>
  is_active: boolean
  stock_quantity: number | null
  created_at: string
  /** シリーズの子商品なら親シリーズの id。単品なら null */
  series_id: string | null
  /** シリーズの軸ごとの値。例: { 動物: 'ねこ', サイズ: '高さ約10cm' } */
  variant_options: Record<string, string>
  /** シリーズ内の並び順 */
  series_sort: number
}

/** 物販のシリーズ（親）。商品ページはシリーズで1つにまとまり、その中で子商品を選ぶ */
export interface ProductSeries {
  id: string
  name: string
  slug: string
  description: string | null
  /** 写真と動画を表示順のまま並べた配列。先頭がメイン */
  media_urls: string[]
  /** 選ぶ軸の名前（表示順）。例: ['動物', 'サイズ'] */
  option_axes: string[]
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductSeriesWithItems extends ProductSeries {
  /** 公開中の子商品。series_sort 順 */
  items: Product[]
}

export async function getAllProducts(): Promise<Product[]> {
  const client = await readClient()
  let query = client.from('products').select('*')
  if (!PREVIEW_INACTIVE) query = query.eq('is_active', true)
  const { data } = await query.order('created_at', { ascending: false })
  return (data as Product[]) || []
}

/** 公開中のシリーズ。並び順は sort_order → 作成日 */
export async function getAllSeries(): Promise<ProductSeries[]> {
  const client = await readClient()
  let query = client.from('product_series').select('*')
  if (!PREVIEW_INACTIVE) query = query.eq('is_active', true)
  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    // migration 未適用でも商品一覧そのものは出せるようにする
    console.error('[products] series list', error.code, error.message)
    return []
  }
  return (data as ProductSeries[]) || []
}

/** シリーズ1件と、その公開中の子商品 */
export async function getSeriesBySlug(slug: string): Promise<ProductSeriesWithItems | null> {
  const client = await readClient()
  let seriesQuery = client.from('product_series').select('*').eq('slug', slug)
  if (!PREVIEW_INACTIVE) seriesQuery = seriesQuery.eq('is_active', true)
  const { data: series } = await seriesQuery.maybeSingle()
  if (!series) return null

  // カートで買えるのは物販（category='product'）だけ。ほかの種類は選択肢に出さない
  let itemsQuery = client.from('products').select('*').eq('series_id', series.id).eq('category', 'product')
  if (!PREVIEW_INACTIVE) itemsQuery = itemsQuery.eq('is_active', true)
  const { data: items } = await itemsQuery
    .order('series_sort', { ascending: true })
    .order('created_at', { ascending: true })

  // 項目のどれかに値が無い商品は選びようがないので出さない（項目名を変えた直後など）
  const axes = (series as ProductSeries).option_axes ?? []
  const complete = ((items as Product[]) || []).filter((item) => isCompleteVariant(item, axes))
  return { ...(series as ProductSeries), items: complete }
}

/** 子商品から親シリーズの slug を引く（公開中のシリーズだけ） */
export async function getSeriesSlug(seriesId: string): Promise<string | null> {
  const client = await readClient()
  let query = client.from('product_series').select('slug').eq('id', seriesId)
  if (!PREVIEW_INACTIVE) query = query.eq('is_active', true)
  const { data } = await query.maybeSingle()
  return (data as { slug: string } | null)?.slug ?? null
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  return (data as Product) || null
}
