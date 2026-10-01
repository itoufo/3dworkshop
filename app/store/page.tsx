import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { MAIN_SITE_URL, SELLER_MIN_ENROLLED_MONTHS } from '@/lib/store/urls'

interface ListedProduct {
  id: string
  title: string
  image_urls: string[]
  sell_data: boolean
  data_price: number | null
  sell_print: boolean
  print_price: number | null
  store_sellers: { display_name: string; slug: string } | null
}

async function publishedProducts(): Promise<ListedProduct[]> {
  if (!supabaseAdmin) return []
  const { data, error } = await supabaseAdmin
    .from('store_products')
    .select('id, title, image_urls, sell_data, data_price, sell_print, print_price, store_sellers(display_name, slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(60)
  if (error) {
    console.error('[store] product list failed:', error)
    return []
  }
  return (data ?? []) as unknown as ListedProduct[]
}

export const metadata: Metadata = {
  title: { absolute: 'みんなの作品ストア | 3DLab' },
  alternates: { canonical: '/' },
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

export default async function StoreTopPage() {
  const products = await publishedProducts()

  return (
    <>
      <section className="bg-gradient-to-br from-purple-50 to-pink-50 border-b border-purple-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            スクール生がつくった
            <br />
            3D作品のストア
          </h1>
          <p className="mt-5 text-base md:text-lg text-gray-700 max-w-2xl">
            3D データをダウンロードして自分の3Dプリンターで印刷するか、
            3DLab が印刷して完成品をお届けするかを選べます。
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">作品</h2>
        {products.length === 0 ? (
          <p className="text-base text-gray-600">
            いま出品されている作品はありません。最初の出品を準備しています。
          </p>
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
                  {p.store_sellers && (
                    <p className="text-base text-gray-500">{p.store_sellers.display_name}</p>
                  )}
                  <p className="mt-1 text-base text-gray-800">
                    {p.sell_data && p.data_price != null && <span className="mr-3">データ {yen(p.data_price)}</span>}
                    {p.sell_print && p.print_price != null && <span>完成品 {yen(p.print_price)}</span>}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">あなたの作品も出品できます</h2>
            <p className="mt-4 text-base text-gray-700">
              3DLab のスクールに{SELLER_MIN_ENROLLED_MONTHS}ヶ月以上在籍している方は、
              自分でつくった 3D データを出品できます。出品は審査のうえ掲載します。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
            <Link
              href="/sell"
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-center"
            >
              出品について
            </Link>
            <a
              href={`${MAIN_SITE_URL}/school`}
              className="px-6 py-3 rounded-lg border border-purple-600 text-purple-700 font-bold text-center"
            >
              スクールを見る
            </a>
            <a
              href={`${MAIN_SITE_URL}/workshops`}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold text-center"
            >
              体験ワークショップ
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
