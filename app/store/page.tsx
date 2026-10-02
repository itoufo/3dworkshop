import type { Metadata } from 'next'
import StoreTop from '@/components/store/StoreTop'
import { publishedProducts } from '@/lib/store/top-products'

export const metadata: Metadata = {
  title: { absolute: '3DLab Store（みんなの作品ストア）| 3Dデータと3Dプリント作品' },
  alternates: {
    canonical: '/',
    languages: { ja: '/', en: '/en', 'x-default': '/' },
  },
}

export default async function StoreTopPage() {
  return <StoreTop locale="ja" products={await publishedProducts()} />
}
