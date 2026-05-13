import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import { ArrowRight, FolderOpen, Calendar, Sparkles } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'ワークショップカテゴリ一覧 | 3DLab 東京・湯島',
  description: '3DLabで開催中のワークショップをカテゴリ別に一覧表示。親子向け、フィギュア制作、経営者向けNFC、オンラインなど、目的に合ったワークショップを見つけられます。',
  openGraph: {
    title: 'ワークショップカテゴリ一覧 | 3DLab',
    description: '3DLabのワークショップをカテゴリ別に探せます。',
  },
}

interface CategoryWithStats {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sort_order: number
  upcoming_count: number      // upcoming session を持つ workshop 数
  total_count: number         // 配下 workshop 総数
  held_count: number          // 過去 session の総数 (= 累計開催回数)
}

export default async function WorkshopCategoriesIndex() {
  // カテゴリ + 各カテゴリの workshops を JOIN で取得
  const { data: categories } = await supabase
    .from('workshop_categories')
    .select('id, name, slug, description, image_url, sort_order')
    .order('sort_order', { ascending: true })

  // 各カテゴリの workshop 数 + sessions 情報を計算
  const { data: workshops } = await supabase
    .from('workshops')
    .select('id, category_id, sessions:workshop_sessions(event_date, status)')
    .eq('is_service', false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const stats = new Map<string, { upcoming: number; total: number; held: number }>()
  for (const w of workshops || []) {
    if (!w.category_id) continue
    const sessions = w.sessions || []
    const hasUpcoming = sessions.some(
      (s) => s.status === 'scheduled' && s.event_date >= todayIso
    )
    // 過去 session の数 = 累計開催回数
    const pastCount = sessions.filter((s) => s.event_date < todayIso).length
    const entry = stats.get(w.category_id) || { upcoming: 0, total: 0, held: 0 }
    entry.total += 1
    entry.held += pastCount
    if (hasUpcoming) entry.upcoming += 1
    stats.set(w.category_id, entry)
  }

  const categoriesWithStats: CategoryWithStats[] = (categories || [])
    .map((c) => ({
      ...c,
      upcoming_count: stats.get(c.id)?.upcoming || 0,
      total_count: stats.get(c.id)?.total || 0,
      held_count: stats.get(c.id)?.held || 0,
    }))
    // 累計開催回数 desc → upcoming desc → sort_order asc
    .sort((a, b) => {
      if (b.held_count !== a.held_count) return b.held_count - a.held_count
      if (b.upcoming_count !== a.upcoming_count) return b.upcoming_count - a.upcoming_count
      return a.sort_order - b.sort_order
    })

  // 構造化データ
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://3dlab.jp' },
      { '@type': 'ListItem', position: 2, name: 'ワークショップ', item: 'https://3dlab.jp/workshops' },
      { '@type': 'ListItem', position: 3, name: 'カテゴリ一覧', item: 'https://3dlab.jp/workshops/categories' },
    ],
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />

      {/* Breadcrumb */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-purple-600 transition-colors">ホーム</Link>
            <span>/</span>
            <Link href="/workshops" className="hover:text-purple-600 transition-colors">ワークショップ</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">カテゴリ一覧</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
            <FolderOpen className="w-4 h-4 mr-2" />
            ワークショップカテゴリ
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              目的別ワークショップ一覧
            </span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            親子向け・フィギュア制作・経営者向けNFCなど、目的に合わせて選べる多彩なカテゴリをご用意しています。
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {categoriesWithStats.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">カテゴリがまだ登録されていません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {categoriesWithStats.map((cat) => (
              <Link
                key={cat.id}
                href={`/workshops/category/${cat.slug}`}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1"
              >
                {/* Image */}
                {cat.image_url ? (
                  <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                    <Image
                      src={optimizeImageUrl(cat.image_url, 75)}
                      alt={`${cat.name} ワークショップ`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {cat.upcoming_count > 0 && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-white/95 backdrop-blur text-purple-700 text-xs font-semibold rounded-full flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        開催予定 {cat.upcoming_count}件
                      </div>
                    )}
                    {cat.upcoming_count === 0 && cat.total_count > 0 && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-full flex items-center shadow">
                        <Sparkles className="w-3 h-3 mr-1" />
                        リクエスト受付中
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
                    <div className="w-24 h-24 bg-white/50 rounded-2xl flex items-center justify-center">
                      <FolderOpen className="w-12 h-12 text-purple-600" />
                    </div>
                    {cat.upcoming_count > 0 && (
                      <div className="absolute top-4 left-4 px-3 py-1 bg-white/95 backdrop-blur text-purple-700 text-xs font-semibold rounded-full flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        開催予定 {cat.upcoming_count}件
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {cat.name}
                  </h2>
                  {cat.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {cat.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="text-xs text-gray-500">
                      累計 {cat.held_count}回 開催
                    </div>
                    <div className="text-purple-600 group-hover:text-purple-700 flex items-center text-sm font-medium transition-colors">
                      詳細を見る
                      <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* CTA to all workshops */}
        <div className="mt-16 text-center">
          <Link
            href="/workshops"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300"
          >
            全てのワークショップを見る
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </main>
    </div>
  )
}
