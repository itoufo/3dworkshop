import type { Metadata } from 'next'
import StoreTop from '@/components/store/StoreTop'
import { lowestStorePrices, publishedProducts } from '@/lib/store/top-products'
import { MAIN_SITE_URL, STORE_URL } from '@/lib/store/urls'

// ストアの英語トップ（stores.3dlab.jp/en）。
// ⚠ 英語なのはこのページとヘッダー・フッターだけ。作品ページ・カート・決済・購入後のメールは
//   日本語のままで、完成品の発送先は日本国内だけ。その旨は本文の注意書きに書いてある
//   （lib/store/top-copy.ts の notice）。
const TITLE = '3DLab Store | 3D data and 3D-printed works from Tokyo'
const DESCRIPTION =
  'Works by 3DLab and the students of its 3D printing school in Yushima, Tokyo. Buy the 3D data to print yourself, or a finished print shipped within Japan.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: '/en',
    languages: { ja: '/', en: '/en', 'x-default': '/' },
  },
  // ⚠ openGraph は app/store/layout.tsx のものが丸ごと置き換わるので、画像も書き直す
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${STORE_URL}/en`,
    locale: 'en_US',
    siteName: '3DLab Store',
    type: 'website',
    images: [{ url: `${MAIN_SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
  // ⚠ 書かないと app/layout.tsx の日本語の twitter:title / description がそのまま出る
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`${MAIN_SITE_URL}/og-image.jpg`] },
}

export default async function StoreEnglishTopPage() {
  const [products, lowestPrices] = await Promise.all([publishedProducts(), lowestStorePrices()])
  return (
    // <html lang="ja"> はルートレイアウトで固定なので、中身を lang="en" で包む（app/en/layout.tsx と同じやり方）
    <div lang="en">
      <StoreTop locale="en" products={products} lowestPrices={lowestPrices} />
    </div>
  )
}
