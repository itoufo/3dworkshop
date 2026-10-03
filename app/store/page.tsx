import type { Metadata } from 'next'
import StoreTop from '@/components/store/StoreTop'
import { lowestStorePrices, publishedProducts } from '@/lib/store/top-products'
import { MAIN_SITE_URL, STORE_URL } from '@/lib/store/urls'

const TITLE = '3DLab Store（みんなの作品ストア）| 3Dデータと3Dプリント作品'
const DESCRIPTION =
  '3DLab とスクール生がつくった3D作品のストア。3Dデータをダウンロードして自分のプリンターで印刷する買い方と、3DLab が印刷した完成品を届けてもらう買い方があります。'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: '/',
    languages: { ja: '/', en: '/en', 'x-default': '/' },
  },
  // ⚠ openGraph は app/store/layout.tsx のものが丸ごと置き換わるので、サイト名・画像も書き直す
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${STORE_URL}/`,
    locale: 'ja_JP',
    siteName: '3DLab みんなの作品ストア',
    type: 'website',
    images: [{ url: `${MAIN_SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
  // ⚠ 書かないと app/layout.tsx の教室の twitter:title / description がそのまま出る
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`${MAIN_SITE_URL}/og-image.jpg`] },
}

export default async function StoreTopPage() {
  const [products, lowestPrices] = await Promise.all([publishedProducts(), lowestStorePrices()])
  return <StoreTop locale="ja" products={products} lowestPrices={lowestPrices} />
}
