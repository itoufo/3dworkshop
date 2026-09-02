import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductsListClient from '@/components/ProductsListClient'
import { getAllProducts } from '@/lib/products'
import { getAllServices } from '@/lib/services'
import { firstImageUrl } from '@/lib/media'

// ISR: cache for 1 hour
export const revalidate = 3600

const SITE_URL = 'https://3dlab.jp'

export default async function ProductsPage() {
  const [products, services] = await Promise.all([
    getAllProducts(),
    getAllServices(),
  ])

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
      ...products.map((product, index) => ({
        '@type': 'ListItem',
        position: services.length + index + 1,
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
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

          <ProductsListClient products={products} services={services} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
