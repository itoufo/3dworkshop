import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { approvedSellerOrRedirect } from '@/lib/store/seller-guard'
import { PRODUCT_STATUS_LABEL, type ProductStatus } from '@/lib/store/product-rules'
import SellNav from '@/components/store/SellNav'

export const metadata: Metadata = { title: '作品の管理', robots: { index: false, follow: false } }

const STATUS_COLOR: Record<ProductStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-amber-100 text-amber-900',
  archived: 'bg-gray-100 text-gray-500',
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

export default async function SellProductsPage() {
  const user = await approvedSellerOrRedirect('/sell/products')
  const { data: products } = await supabaseAdmin!
    .from('store_products')
    .select('id, title, image_urls, status, review_note, sell_data, data_price, sell_print, print_price, updated_at')
    .eq('seller_id', user.seller.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <SellNav current="products" title="作品" />
      <Link href="/sell/products/new" className="inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
        作品を登録する
      </Link>

      {(products ?? []).length === 0 ? (
        <p className="mt-8 text-base text-gray-600">まだ作品がありません。</p>
      ) : (
        <ul className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
          {(products ?? []).map((p) => (
            <li key={p.id}>
              <Link href={`/sell/products/${p.id}`} className="flex gap-4 py-4 hover:bg-gray-50">
                <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {p.image_urls?.[0] && <Image src={p.image_urls[0]} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-base ${STATUS_COLOR[p.status as ProductStatus]}`}>
                    {PRODUCT_STATUS_LABEL[p.status as ProductStatus]}
                  </span>
                  <p className="mt-1 text-base font-bold text-gray-900 truncate">{p.title}</p>
                  <p className="text-base text-gray-600">
                    {p.sell_data && p.data_price != null && <span className="mr-3">データ {yen(p.data_price)}</span>}
                    {p.sell_print && p.print_price != null && <span>完成品 {yen(p.print_price)}</span>}
                  </p>
                  {p.status === 'rejected' && p.review_note && (
                    <p className="mt-1 text-base text-amber-800 line-clamp-2">差し戻しの理由: {p.review_note}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
