import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductGallery from '@/components/ProductGallery'
import ShareButtons from '@/components/ShareButtons'
import ProductPurchaseForm from '@/components/ProductPurchaseForm'
import MediaCoverage from '@/components/MediaCoverage'
import { getProduct } from '@/lib/products'
import { firstImageUrl, imageUrlsOnly } from '@/lib/media'
import { SHIPPING_LEAD_TIME_TEXT, shippingFeeLabel } from '@/lib/shipping'
import { Truck, Package, ShieldCheck } from 'lucide-react'

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

  const media = product.media_urls ?? []
  const images = imageUrlsOnly(media)
  const inStock = product.stock_quantity === null || product.stock_quantity > 0
  const specifications = Object.entries(product.specifications ?? {}).filter(
    ([, value]) => value !== null && value !== ''
  )

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <ProductGallery media={media} alt={product.name} />
              <p className="mt-3 text-base text-gray-500">
                ※ 写真・動画はイメージです。3Dプリント製品のため、色味や積層跡に個体差があります。
              </p>
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 bg-purple-100 text-purple-700">
                オンラインストア
              </span>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>

              {product.description && (
                <p className="text-gray-700 whitespace-pre-line mb-6">{product.description}</p>
              )}

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-4">
                <p className="text-sm text-gray-600 mb-1">価格（税込）</p>
                <p className="text-3xl font-bold text-gray-900">
                  ¥{product.base_price.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mt-2">{shippingFeeLabel()}</p>
              </div>

              <div className="bg-white rounded-xl p-5 space-y-3 mb-4">
                <div className="flex items-start">
                  <Truck className="w-5 h-5 text-purple-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">{SHIPPING_LEAD_TIME_TEXT}</p>
                    <p className="text-base text-gray-600">
                      1点ずつ3Dプリンタで製作するため、お届けまでお時間をいただきます。
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Package className="w-5 h-5 text-purple-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {product.stock_quantity === null
                        ? '受注製作'
                        : inStock
                          ? `在庫あり（残り ${product.stock_quantity} 点）`
                          : '売り切れ'}
                    </p>
                    <p className="text-base text-gray-600">お届け先は決済画面でご入力いただきます。</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <ShieldCheck className="w-5 h-5 text-purple-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">Stripe による安全な決済</p>
                    <p className="text-base text-gray-600">カード情報が当社に保存されることはありません。</p>
                  </div>
                </div>
              </div>

              <ShareButtons url={`${SITE_URL}/products/${product.id}`} title={product.name} />
            </div>
          </div>

          {specifications.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">商品仕様</h2>
              <dl className="divide-y divide-gray-100">
                {specifications.map(([key, value]) => (
                  <div key={key} className="py-3 flex flex-col sm:flex-row sm:items-baseline">
                    <dt className="w-40 shrink-0 text-gray-500">{key}</dt>
                    <dd className="text-gray-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">この商品を購入する</h2>
            <p className="text-gray-600 mb-6">
              数量をお選びのうえ、決済画面でお届け先をご入力ください。{SHIPPING_LEAD_TIME_TEXT}します。
            </p>
            <ProductPurchaseForm
              productId={product.id}
              unitPrice={product.base_price}
              stockQuantity={product.stock_quantity}
            />
          </div>

          <MediaCoverage />
        </div>
      </main>
      <Footer />
    </div>
  )
}
