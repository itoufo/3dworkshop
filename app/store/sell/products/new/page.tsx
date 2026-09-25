import type { Metadata } from 'next'
import { approvedSellerOrRedirect } from '@/lib/store/seller-guard'
import SellNav from '@/components/store/SellNav'
import ProductEditor, { EMPTY_PRODUCT } from '@/components/store/ProductEditor'

export const metadata: Metadata = { title: '作品を登録', robots: { index: false, follow: false } }

export default async function NewProductPage() {
  await approvedSellerOrRedirect('/sell/products/new')
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <SellNav current="products" title="作品を登録" />
      <ProductEditor initial={EMPTY_PRODUCT} />
    </div>
  )
}
