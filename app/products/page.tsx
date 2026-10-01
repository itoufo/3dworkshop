import Header from '@/components/Header'
import { jsonLdString } from '@/lib/json-ld'
import Footer from '@/components/Footer'
import ProductsListClient, { type SeriesCard } from '@/components/ProductsListClient'
import { getAllProducts, getAllSeries } from '@/lib/products'
import { isCompleteVariant, lowestPrice } from '@/lib/product-variants'
import { getAllServices } from '@/lib/services'
import { firstImageUrl } from '@/lib/media'

// ISR: cache for 1 hour
export const revalidate = 3600

const SITE_URL = 'https://3dlab.jp'

export default async function ProductsPage() {
  const [allProducts, services, allSeries] = await Promise.all([
    getAllProducts(),
    getAllServices(),
    getAllSeries(),
  ])

  // シリーズの子商品は個別に並べず、シリーズを1枚のカードにまとめる
  const products = allProducts.filter((p) => !p.series_id)
  const seriesCards: SeriesCard[] = allSeries
    .map((s) => {
      // シリーズのページに出せない（項目の値が欠けた）商品は、価格・件数に入れない
      const items = allProducts.filter((p) => p.series_id === s.id && isCompleteVariant(p, s.option_axes ?? []))
      return {
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        image: firstImageUrl(s.media_urls) || firstImageUrl(items.flatMap((i) => i.media_urls ?? [])),
        lowestPrice: lowestPrice(items) ?? 0,
        itemCount: items.length,
        inStock: items.some((i) => i.stock_quantity === null || i.stock_quantity > 0),
      }
    })
    // 公開中の子商品が無いシリーズは買えないので出さない
    .filter((card) => card.itemCount > 0)

  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '3Dプリント制作・オーダーメイド', item: `${SITE_URL}/products` },
    ],
  }

  // 掲載中のサービス・商品を ItemList で明示（価格は「〜」表記に合わせて lowPrice で表現）
  const itemListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '3Dプリント制作・オーダーメイド',
    itemListElement: [
      ...services.map((service, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Product',
          name: service.title,
          description: service.description || `${service.type === 'reprint' ? '追加印刷' : 'オーダーメイド'}サービス: ${service.title}`,
          image: service.image_url || `${SITE_URL}/og-image.jpg`,
          url: `${SITE_URL}/services/${service.id}`,
          brand: { '@type': 'Brand', name: '3DLab' },
          offers: {
            '@type': 'AggregateOffer',
            lowPrice: service.price,
            priceCurrency: 'JPY',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/services/${service.id}`,
          },
        },
      })),
      ...seriesCards.map((card, index) => ({
        '@type': 'ListItem',
        position: services.length + index + 1,
        item: {
          '@type': 'ProductGroup',
          name: card.name,
          description: card.description || card.name,
          image: card.image || `${SITE_URL}/og-image.jpg`,
          url: `${SITE_URL}/products/series/${card.slug}`,
          brand: { '@type': 'Brand', name: '3DLab' },
          offers: {
            '@type': 'AggregateOffer',
            lowPrice: card.lowestPrice,
            offerCount: card.itemCount,
            priceCurrency: 'JPY',
            availability: card.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            url: `${SITE_URL}/products/series/${card.slug}`,
          },
        },
      })),
      ...products.map((product, index) => ({
        '@type': 'ListItem',
        position: services.length + seriesCards.length + index + 1,
        item: {
          '@type': 'Product',
          name: product.name,
          description: product.description || product.name,
          image: firstImageUrl(product.media_urls) || `${SITE_URL}/og-image.jpg`,
          url: product.category === '3d_printing'
            ? `${SITE_URL}/products/3d-printing/new`
            : `${SITE_URL}/products/${product.id}`,
          brand: { '@type': 'Brand', name: '3DLab' },
          offers: product.category === '3d_printing'
            ? {
                '@type': 'AggregateOffer',
                lowPrice: product.base_price,
                priceCurrency: 'JPY',
                availability: 'https://schema.org/InStock',
                url: `${SITE_URL}/products/3d-printing/new`,
              }
            : {
                '@type': 'Offer',
                price: product.base_price,
                priceCurrency: 'JPY',
                availability: product.stock_quantity === null || product.stock_quantity > 0
                  ? 'https://schema.org/InStock'
                  : 'https://schema.org/OutOfStock',
                url: `${SITE_URL}/products/${product.id}`,
              },
        },
      })),
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(itemListData) }}
      />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                3Dプリント制作・オーダーメイド
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              STLファイルから高品質な3Dプリント制作を承ります。オリジナル商品のオーダーメイドもお気軽にご相談ください
            </p>
            <p className="mt-4 text-base text-gray-500 max-w-2xl mx-auto">
              ※ 各種製作画像はあくまでイメージです。実際の仕上がりは形状・素材・色味などにより異なる場合があります。
            </p>
          </div>

          <ProductsListClient products={products} services={services} series={seriesCards} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
