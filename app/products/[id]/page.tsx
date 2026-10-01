import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import { jsonLdString } from '@/lib/json-ld'
import Footer from '@/components/Footer'
import MediaCoverage from '@/components/MediaCoverage'
import ProductDetailClient from '@/components/ProductDetailClient'
import { getProduct, getSeriesSlug } from '@/lib/products'
import { firstImageUrl, imageUrlsOnly } from '@/lib/media'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'

export const revalidate = 3600

const SITE_URL = 'https://3dlab.jp'

// 販売中の商品をビルド時に列挙して ISR 化する（無いとルート全体が毎リクエスト SSR になる）
export async function generateStaticParams() {
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('is_active', true)
    .neq('category', '3d_printing')
    // シリーズの子商品は単独のページを持たない（シリーズのページへ転送する）
    .is('series_id', null)
  return (data ?? []).map(({ id }) => ({ id }))
}

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return { title: '商品が見つかりません' }

  // ルートレイアウトの title.template ("%s | 3DLab") が付くため、ここでは 3DLab を書かない
  const title = `${product.name} | オンラインストア`
  const shareTitle = `${product.name} | 3DLab オンラインストア`
  const description = product.description
    ? product.description.slice(0, 120)
    : `${product.name}（${SHIPPING_LEAD_TIME_TEXT}）`
  // SNS シェア画像に動画は使えないので、最初の「写真」を選ぶ
  const image = firstImageUrl(product.media_urls) || `${SITE_URL}/og-image.jpg`

  // SNS でシェアされたときに写真とタイトルが出るようにする
  return {
    title,
    description,
    alternates: { canonical: `/products/${id}` },
    openGraph: {
      title: shareTitle,
      description,
      url: `${SITE_URL}/products/${id}`,
      siteName: '3DLab - 3Dプリンタ教室',
      images: [{ url: image, width: 1200, height: 630, alt: product.name }],
      locale: 'ja_JP',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description,
      images: [image],
    },
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product || !product.is_active) notFound()

  // シリーズの子商品は、シリーズのページでその商品を選んだ状態に転送する
  // （注文確認メールや決済キャンセルの戻り先はこの URL のままなので、ここで受ける）
  if (product.series_id) {
    const slug = await getSeriesSlug(product.series_id)
    if (!slug) notFound()
    redirect(`/products/series/${slug}?v=${product.id}`)
  }

  const media = product.media_urls ?? []
  const images = imageUrlsOnly(media)
  const inStock = product.stock_quantity === null || product.stock_quantity > 0

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.name,
    image: images.length > 0 ? images : [`${SITE_URL}/og-image.jpg`],
    brand: { '@type': 'Brand', name: '3DLab' },
    offers: {
      '@type': 'Offer',
      price: product.base_price,
      priceCurrency: 'JPY',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/products/${product.id}`,
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(productJsonLd) }}
      />
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* 単品は「選ぶ項目が無い、商品1つのシリーズ」として同じ部品で出す */}
          <ProductDetailClient
            title={product.name}
            description={product.description}
            sharedMedia={[]}
            axes={[]}
            items={[
              {
                id: product.id,
                name: product.name,
                description: product.description,
                base_price: product.base_price,
                media_urls: media,
                specifications: product.specifications ?? {},
                stock_quantity: product.stock_quantity,
                variant_options: {},
              },
            ]}
            shareUrl={`${SITE_URL}/products/${product.id}`}
            purchasable={product.category === 'product'}
          />
          <div className="max-w-4xl mx-auto">
            <MediaCoverage />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
