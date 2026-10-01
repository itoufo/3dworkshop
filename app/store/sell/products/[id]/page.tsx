import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { approvedSellerOrRedirect } from '@/lib/store/seller-guard'
import SellNav from '@/components/store/SellNav'
import ProductEditor from '@/components/store/ProductEditor'
import type { ProductStatus } from '@/lib/store/product-rules'

export const metadata: Metadata = { title: '作品を編集', robots: { index: false, follow: false } }

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await approvedSellerOrRedirect(`/sell/products/${id}`)
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()

  // ⚠ 自分の作品だけ（seller_id で絞る）
  const { data: p } = await supabaseAdmin!
    .from('store_products')
    .select('*')
    .eq('id', id)
    .eq('seller_id', user.seller.id)
    .maybeSingle()
  if (!p) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <SellNav current="products" title="作品を編集" />
      <ProductEditor
        initial={{
          id: p.id,
          status: p.status as ProductStatus,
          review_note: p.review_note,
          title: p.title,
          description: p.description ?? '',
          image_urls: p.image_urls ?? [],
          data_file_path: p.data_file_path,
          data_file_name: p.data_file_name,
          sell_data: p.sell_data,
          data_price: p.data_price != null ? String(p.data_price) : '',
          sell_print: p.sell_print,
          print_price: p.print_price != null ? String(p.print_price) : '',
          print_spec: p.print_spec ?? '',
        }}
      />
    </div>
  )
}
