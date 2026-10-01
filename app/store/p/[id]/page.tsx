import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import ProductGallery from '@/components/ProductGallery'
import StoreBuyForm from '@/components/store/StoreBuyForm'
import LikeButton from '@/components/store/LikeButton'
import { getPublicProduct, hasLiked, likeCounts } from '@/lib/store/catalog'
import { currentStoreUser } from '@/lib/store/session'
import { jsonLdString } from '@/lib/json-ld'
import { STORE_URL } from '@/lib/store/urls'
import { printPriceRange } from '@/lib/store/variants'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getPublicProduct(id)
  if (!product) return { title: '作品が見つかりません', robots: { index: false } }
  const description = (product.description ?? '').replace(/\s+/g, ' ').slice(0, 120) || `${product.seller.display_name} の作品`
  return {
    title: product.title,
    description,
    alternates: { canonical: `/p/${product.id}` },
    openGraph: {
      title: product.title,
      description,
      url: `${STORE_URL}/p/${product.id}`,
      images: product.image_urls[0] ? [{ url: product.image_urls[0] }] : undefined,
    },
  }
}

export default async function StoreProductPage({ params }: Props) {
  const { id } = await params
  const product = await getPublicProduct(id)
  if (!product) notFound()

  const user = await currentStoreUser()
  const [counts, liked] = await Promise.all([
    likeCounts([product.id]),
    user ? hasLiked(product.id, user.miraiidUserId) : Promise.resolve(false),
  ])

  const dataPrice = product.sell_data ? product.data_price : null
  const printPrice = product.sell_print ? product.print_price : null
  const printRange = printPriceRange(product)
  const prices = [dataPrice, printRange?.min, printRange?.max].filter((p): p is number => p != null)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image: product.image_urls,
    url: `${STORE_URL}/p/${product.id}`,
    brand: { '@type': 'Brand', name: product.seller.display_name },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'JPY',
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: (dataPrice != null ? 1 : 0) + (product.sell_print ? Math.max(1, product.print_variants.length) : 0),
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-purple-700">ストア</Link>
        <span className="mx-2">/</span>
        <Link href={`/s/${product.seller.slug}`} className="hover:text-purple-700">{product.seller.display_name}</Link>
      </nav>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8">
        <div>
          <ProductGallery media={product.image_urls} alt={product.title} thumbs="left" />
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{product.title}</h1>
            <Link
              href={`/s/${product.seller.slug}`}
              className="mt-3 inline-flex items-center gap-2 text-base text-gray-700 hover:text-purple-700"
            >
              {product.seller.avatar_url ? (
                <Image src={product.seller.avatar_url} alt="" width={32} height={32} className="rounded-full object-cover w-8 h-8" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  {product.seller.display_name.slice(0, 1)}
                </span>
              )}
              {product.seller.display_name}
            </Link>
          </div>
          <LikeButton
            productId={product.id}
            initialCount={counts[product.id] ?? 0}
            initialLiked={liked}
            loggedIn={Boolean(user)}
          />
          <StoreBuyForm
            productId={product.id}
            title={product.title}
            dataPrice={dataPrice}
            printPrice={printPrice}
            printSpec={product.print_spec}
            axes={product.option_axes}
            variants={product.print_variants}
          />
        </div>
      </div>

      {(product.description || product.print_spec) && (
        <section className="mt-12 max-w-3xl space-y-8">
          {product.description && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">作品について</h2>
              <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            </div>
          )}
          {product.sell_print && product.print_spec && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">完成品の仕様</h2>
              <p className="text-base text-gray-800 whitespace-pre-wrap">{product.print_spec}</p>
            </div>
          )}
          {product.sell_data && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">データの使い方</h2>
              <p className="text-base text-gray-800">
                購入したデータは、ご自身で印刷して楽しむためのものです。データそのものの再配布・再販売はできません。
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
