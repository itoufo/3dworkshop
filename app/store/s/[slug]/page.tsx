import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPublicSeller } from '@/lib/store/catalog'

interface Props {
  params: Promise<{ slug: string }>
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await getPublicSeller(slug)
  if (!result) return { title: '出品者が見つかりません', robots: { index: false } }
  return {
    title: `${result.seller.display_name} の作品`,
    description: (result.seller.bio ?? '').replace(/\s+/g, ' ').slice(0, 120) || undefined,
    alternates: { canonical: `/s/${result.seller.slug}` },
  }
}

export default async function StoreSellerPage({ params }: Props) {
  const { slug } = await params
  const result = await getPublicSeller(slug)
  if (!result) notFound()
  const { seller, products } = result

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <section className="flex flex-col sm:flex-row sm:items-center gap-5 pb-8 border-b border-gray-200">
        {seller.avatar_url ? (
          <Image src={seller.avatar_url} alt="" width={96} height={96} className="rounded-full object-cover w-24 h-24" />
        ) : (
          <span className="w-24 h-24 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-3xl font-bold">
            {seller.display_name.slice(0, 1)}
          </span>
        )}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{seller.display_name}</h1>
          {seller.bio && <p className="mt-3 text-base text-gray-700 whitespace-pre-wrap max-w-2xl">{seller.bio}</p>}
        </div>
      </section>

      <section className="py-10">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">作品</h2>
        {products.length === 0 ? (
          <p className="text-base text-gray-600">いま掲載中の作品はありません。</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.id}`} className="group block">
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                    {p.image_urls[0] && (
                      <Image
                        src={p.image_urls[0]}
                        alt={p.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </div>
                  <p className="mt-3 text-base font-bold text-gray-900 line-clamp-2">{p.title}</p>
                  <p className="mt-1 text-base text-gray-800">
                    {p.sell_data && p.data_price != null && <span className="mr-3">データ {yen(p.data_price)}</span>}
                    {p.sell_print && p.print_price != null && (
                      <span>
                        完成品 {yen(p.print_price)}
                        {p.print_variants.length > 1 && new Set(p.print_variants.map((v) => v.price)).size > 1 && '〜'}
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
