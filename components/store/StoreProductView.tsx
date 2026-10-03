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
import { storePath, type StoreLocale } from '@/lib/store/locale'
import { STORE_UI } from '@/lib/store/ui-copy'
import { STORE_URL } from '@/lib/store/urls'
import { printPriceRange } from '@/lib/store/variants'

/**
 * 作品ページの中身（日本語 /p/<id> と英語 /en/p/<id> で共通）。
 * ⚠ 作品名・説明・仕様・出品者名は出品者が入れた文字。英語のページでも訳さず、lang="ja" を付けて出す。
 * ⚠ 出品者のページ（/s/<slug>）は日本語だけなので、英語のページからは日本語のページへ飛ぶ。
 */

/** 作品ページの metadata。日英のページを hreflang で結ぶ */
export async function storeProductMetadata(id: string, locale: StoreLocale): Promise<Metadata> {
  const t = STORE_UI[locale].product
  const product = await getPublicProduct(id)
  if (!product) return { title: t.notFound, robots: { index: false } }
  const description =
    (product.description ?? '').replace(/\s+/g, ' ').slice(0, 120) || t.sellerWorks(product.seller.display_name)
  const path = storePath(locale, `/p/${product.id}`)
  return {
    title: product.title,
    description,
    alternates: {
      canonical: path,
      languages: { ja: `/p/${product.id}`, en: `/en/p/${product.id}`, 'x-default': `/p/${product.id}` },
    },
    openGraph: {
      title: product.title,
      description,
      url: `${STORE_URL}${path}`,
      images: product.image_urls[0] ? [{ url: product.image_urls[0] }] : undefined,
      ...(locale === 'en' ? { locale: 'en_US' } : {}),
    },
  }
}

export default async function StoreProductView({ id, locale }: { id: string; locale: StoreLocale }) {
  const product = await getPublicProduct(id)
  if (!product) notFound()
  const t = STORE_UI[locale].product
  /** 出品者が入れた文字に付ける */
  const userText = locale === 'en' ? { lang: 'ja' } : {}
  /** 出品者のページへのリンクに付ける（英語のページから日本語のページへ飛ぶことを示す） */
  const sellerLink = locale === 'en' ? { lang: 'ja', hrefLang: 'ja' } : {}

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
    url: `${STORE_URL}${storePath(locale, `/p/${product.id}`)}`,
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
        <Link href={storePath(locale, '/')} className="hover:text-purple-700">{t.store}</Link>
        <span className="mx-2">/</span>
        <Link href={`/s/${product.seller.slug}`} className="hover:text-purple-700" {...sellerLink}>
          {product.seller.display_name}
        </Link>
      </nav>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8">
        <div>
          <ProductGallery media={product.image_urls} alt={product.title} thumbs="left" />
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900" {...userText}>{product.title}</h1>
            <Link
              href={`/s/${product.seller.slug}`}
              className="mt-3 inline-flex items-center gap-2 text-base text-gray-700 hover:text-purple-700"
              {...sellerLink}
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
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.about}</h2>
              <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed" {...userText}>{product.description}</p>
            </div>
          )}
          {product.sell_print && product.print_spec && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.printSpec}</h2>
              <p className="text-base text-gray-800 whitespace-pre-wrap" {...userText}>{product.print_spec}</p>
            </div>
          )}
          {product.sell_data && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{t.dataUse}</h2>
              <p className="text-base text-gray-800">{t.dataUseBody}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
