import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MediaCoverage from '@/components/MediaCoverage'
import SeriesPurchaseClient from '@/components/SeriesPurchaseClient'
import { getSeriesBySlug } from '@/lib/products'
import { firstImageUrl, imageUrlsOnly } from '@/lib/media'
import { lowestPrice, variantLabel } from '@/lib/product-variants'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'

export const revalidate = 3600

const SITE_URL = 'https://3dlab.jp'

// 公開中のシリーズをビルド時に列挙して ISR 化する。
// ⚠ searchParams・cookies() はここで読まない（読むとルート全体が毎リクエスト SSR になる）
export async function generateStaticParams() {
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase.from('product_series').select('slug').eq('is_active', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)
  if (!series) return { title: '商品が見つかりません' }

  const title = `${series.name} | オンラインストア`
  const shareTitle = `${series.name} | 3DLab オンラインストア`
  const description = series.description
    ? series.description.slice(0, 120)
    : `${series.name}（${SHIPPING_LEAD_TIME_TEXT}）`
  const image =
    firstImageUrl(series.media_urls) ||
    firstImageUrl(series.items.flatMap((i) => i.media_urls ?? [])) ||
    `${SITE_URL}/og-image.jpg`

  return {
    title,
    description,
    alternates: { canonical: `/products/series/${slug}` },
    openGraph: {
      title: shareTitle,
      description,
      url: `${SITE_URL}/products/series/${slug}`,
      siteName: '3DLab - 3Dプリンタ教室',
      images: [{ url: image, width: 1200, height: 630, alt: series.name }],
      locale: 'ja_JP',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title: shareTitle, description, images: [image] },
  }
}

export default async function ProductSeriesPage({ params }: PageProps) {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)
  // 子商品が1つも無いシリーズは買えないので出さない
  if (!series || series.items.length === 0) notFound()

  const url = `${SITE_URL}/products/series/${slug}`
  const groupImages = imageUrlsOnly(series.media_urls)

  // バリエーションのある商品は ProductGroup + hasVariant で表す
  const productGroupJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProductGroup',
    name: series.name,
    description: series.description || series.name,
    url,
    productGroupID: series.slug,
    brand: { '@type': 'Brand', name: '3DLab' },
    image: groupImages.length > 0 ? groupImages : [`${SITE_URL}/og-image.jpg`],
    variesBy: series.option_axes,
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: lowestPrice(series.items),
      highPrice: Math.max(...series.items.map((i) => i.base_price)),
      offerCount: series.items.length,
      priceCurrency: 'JPY',
    },
    hasVariant: series.items.map((item) => ({
      '@type': 'Product',
      name: item.name,
      description: variantLabel(item, series.option_axes) || item.name,
      image: imageUrlsOnly(item.media_urls).length > 0 ? imageUrlsOnly(item.media_urls) : groupImages,
      offers: {
        '@type': 'Offer',
        price: item.base_price,
        priceCurrency: 'JPY',
        availability:
          item.stock_quantity === null || item.stock_quantity > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: `${url}?v=${item.id}`,
      },
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productGroupJsonLd) }} />
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <SeriesPurchaseClient
            seriesName={series.name}
            seriesDescription={series.description}
            seriesMedia={series.media_urls ?? []}
            axes={series.option_axes}
            items={series.items.map((item) => ({
              id: item.id,
              name: item.name,
              description: item.description,
              base_price: item.base_price,
              media_urls: item.media_urls ?? [],
              specifications: item.specifications ?? {},
              stock_quantity: item.stock_quantity,
              variant_options: item.variant_options ?? {},
            }))}
            shareUrl={url}
          />
          <MediaCoverage />
        </div>
      </main>
      <Footer />
    </div>
  )
}
