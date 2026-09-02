import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
}

export async function getAllProducts(): Promise<Product[]> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return (data as Product[]) || []
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()
  return (data as Product) || null
}
