import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import { Calendar, Clock, ArrowRight } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const { data: category } = await supabase
    .from('workshop_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) {
    return { title: 'カテゴリが見つかりません | 3DLab' }
  }

  return {
    title: `${category.name} ワークショップ | 3DLab 東京`,
    description: category.description || `${category.name}のワークショップ一覧。東京・湯島の3Dプリンタ教室3DLabで開催。初心者歓迎。`,
    openGraph: {
      title: `${category.name} ワークショップ | 3DLab 東京`,
      description: category.description || `${category.name}のワークショップ一覧`,
      images: category.image_url ? [{ url: category.image_url }] : undefined,
    },
  }
}

export default async function CategoryPillarPage({ params }: Props) {
  const { slug } = await params

  const { data: category } = await supabase
    .from('workshop_categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) {
    notFound()
  }

  const { data: workshops } = await supabase
    .from('workshops')
    .select('*')
    .eq('category_id', category.id)
    .order('event_date', { ascending: true })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingWorkshops = (workshops || []).filter(w => {
    if (!w.event_date) return true
    return new Date(w.event_date) >= today
  })

  const pastWorkshops = (workshops || []).filter(w => {
    if (!w.event_date) return false
    return new Date(w.event_date) < today
  }).reverse()

  // 構造化データ
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://3dlab.jp' },
      { '@type': 'ListItem', position: 2, name: 'ワークショップ', item: 'https://3dlab.jp/workshops' },
      { '@type': 'ListItem', position: 3, name: category.name, item: `https://3dlab.jp/workshops/category/${slug}` },
    ],
  }

  const itemListData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${category.name} ワークショップ`,
    itemListElement: upcomingWorkshops.map((w, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `https://3dlab.jp/workshops/${w.id}`,
      name: w.title,
    })),
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }}
      />

      {/* Breadcrumb */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-purple-600 transition-colors">ホーム</Link>
            <span>/</span>
            <Link href="/workshops" className="hover:text-purple-600 transition-colors">ワークショップ</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              {category.image_url ? (
                <div className="relative aspect-video md:aspect-auto">
                  <Image
                    src={optimizeImageUrl(category.image_url)}
                    alt={`${category.name} ワークショップ`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : (
                <div className="aspect-video md:aspect-auto bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center min-h-[200px]">
                  <div className="w-24 h-24 bg-white/50 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl font-bold text-purple-600">3D</span>
                  </div>
                </div>
              )}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {category.description}
                  </p>
                )}
                <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500">
                  <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                    開催予定 {upcomingWorkshops.length}件
                  </span>
                  {pastWorkshops.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                      過去の開催 {pastWorkshops.length}件
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Workshops */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {upcomingWorkshops.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">開催予定</h2>
              <span className="ml-3 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingWorkshops.map((workshop) => (
                <Link
                  key={workshop.id}
                  href={`/workshops/${workshop.id}`}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
                >
                  {workshop.image_url ? (
                    <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                      <Image
                        src={optimizeImageUrl(workshop.image_url, 75)}
                        alt={workshop.title}
                        fill
                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                      <span className="text-3xl font-bold text-purple-600">3D</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{workshop.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workshop.description}</p>
                    {workshop.event_date && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 mr-2 text-purple-500" />
                        {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                          year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
                        })}
                      </div>
                    )}
                    {workshop.event_time && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4 mr-2 text-purple-500" />
                        {workshop.event_time.slice(0, 5)} 〜（{workshop.duration}分）
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-2xl font-bold text-gray-900">¥{workshop.price.toLocaleString()}</p>
                      <span className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium group-hover:shadow-lg transition-all">
                        詳細を見る
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {upcomingWorkshops.length === 0 && (
          <section className="mb-16">
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">現在、開催予定のワークショップはありません</p>
              <p className="text-gray-400 text-sm">新しい日程が決まり次第、こちらに掲載されます</p>
            </div>
          </section>
        )}

        {/* Past Workshops */}
        {pastWorkshops.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">過去の開催</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastWorkshops.map((workshop) => (
                <Link
                  key={workshop.id}
                  href={`/workshops/${workshop.id}`}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden opacity-75 hover:opacity-100"
                >
                  <div className="relative">
                    {workshop.image_url ? (
                      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                        <Image
                          src={optimizeImageUrl(workshop.image_url, 75)}
                          alt={workshop.title}
                          fill
                          className="object-contain"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <span className="text-3xl font-bold text-gray-400">3D</span>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 px-3 py-1 bg-gray-700 text-white text-xs font-medium rounded-full">
                      終了
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{workshop.title}</h3>
                    {workshop.event_date && (
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(workshop.event_date).toLocaleDateString('ja-JP', {
                          year: 'numeric', month: 'long', day: 'numeric'
                        })}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-purple-600 font-medium">
                      開催レポートを見る
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* SEO Content */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {category.name} ワークショップについて
          </h2>
          <div className="text-gray-700 leading-relaxed space-y-4">
            <p>
              3DLab（スリーディーラボ）では、東京都文京区湯島にて「{category.name}」ワークショップを定期開催しています。
              東京メトロ千代田線 湯島駅から徒歩1分、JR御徒町駅から徒歩8分とアクセス便利な立地です。
            </p>
            <p>
              初心者の方も安心してご参加いただける少人数制で、一人ひとりに丁寧に指導いたします。
              最新の3Dプリンター機材を使用した実践的な体験ができます。
            </p>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/workshops"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all no-underline"
            >
              全てのワークショップを見る
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
