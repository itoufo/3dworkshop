import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import WorkshopRequestForm from '@/components/WorkshopRequestForm'
import { ArrowRight, Calendar, Clock, Users, Sparkles } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'
import styles from '@/app/workshops/[id]/workshop.module.css'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

interface SessionRef {
  id: string
  event_date: string
  event_time: string | null
  status: string
  workshop_id: string
  workshop_title: string
  workshop_price: number
  workshop_max_participants: number
  workshop_duration: number
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data: category } = await supabase
    .from('workshop_categories')
    .select('*')
    .eq('slug', slug)
    .single()
  if (!category) return { title: 'カテゴリが見つかりません | 3DLab' }
  return {
    title: `${category.name} | 3DLab 東京・湯島`,
    description: category.description || `${category.name}のワークショップ。東京・湯島の3Dプリンタ教室3DLabで開催。初心者歓迎。`,
    openGraph: {
      title: `${category.name} | 3DLab`,
      description: category.description || `${category.name}のワークショップ`,
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

  if (!category) notFound()

  // カテゴリ配下の workshops + sessions を取得
  const { data: workshops } = await supabase
    .from('workshops')
    .select('id, title, description, rich_description, price, duration, max_participants, location, image_url, updated_at, sessions:workshop_sessions(id, event_date, event_time, status)')
    .eq('category_id', category.id)
    .eq('is_service', false)
    .order('updated_at', { ascending: false })

  const today = todayIso()

  // 全 upcoming session をフラット化
  const upcomingSessions: SessionRef[] = []
  const pastSessions: SessionRef[] = []
  for (const w of workshops || []) {
    const sessions = (w.sessions || []) as Array<{ id: string; event_date: string; event_time: string | null; status: string }>
    for (const s of sessions) {
      const ref: SessionRef = {
        id: s.id,
        event_date: s.event_date,
        event_time: s.event_time,
        status: s.status,
        workshop_id: w.id,
        workshop_title: w.title,
        workshop_price: w.price,
        workshop_max_participants: w.max_participants,
        workshop_duration: w.duration,
      }
      if (s.status === 'scheduled' && s.event_date >= today) upcomingSessions.push(ref)
      else if (s.event_date < today) pastSessions.push(ref)
    }
  }
  upcomingSessions.sort((a, b) => {
    if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
    return (a.event_time || '').localeCompare(b.event_time || '')
  })
  pastSessions.sort((a, b) => b.event_date.localeCompare(a.event_date))

  // 代表 workshop = 最新の workshop (説明文表示用)
  const representativeWorkshop = (workshops || [])[0] || null

  // 構造化データ
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://3dlab.jp' },
      { '@type': 'ListItem', position: 2, name: 'ワークショップ', item: 'https://3dlab.jp/workshops' },
      { '@type': 'ListItem', position: 3, name: category.name, item: `https://3dlab.jp/workshops/category/${slug}` },
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
            <Link href="/workshops/categories" className="hover:text-purple-600 transition-colors">カテゴリ</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="grid md:grid-cols-2 gap-0">
              {(category.image_url || representativeWorkshop?.image_url) ? (
                <div className="relative aspect-video md:aspect-auto min-h-[280px]">
                  <Image
                    src={optimizeImageUrl(category.image_url || representativeWorkshop?.image_url || '')}
                    alt={`${category.name} ワークショップ`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : (
                <div className="aspect-video md:aspect-auto bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center min-h-[280px]">
                  <div className="w-24 h-24 bg-white/50 rounded-2xl flex items-center justify-center">
                    <span className="text-4xl font-bold text-purple-600">3D</span>
                  </div>
                </div>
              )}
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {category.name}
                </h1>
                {(category.description || representativeWorkshop?.description) && (
                  <p className="text-lg text-gray-600 leading-relaxed">
                    {category.description || representativeWorkshop?.description}
                  </p>
                )}
                <div className="mt-6 flex items-center flex-wrap gap-2 text-sm">
                  <span className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    予約可能 {upcomingSessions.length}日程
                  </span>
                  {pastSessions.length > 0 && (
                    <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                      累計開催 {pastSessions.length}回
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 詳細説明 (代表workshopから) */}
      {representativeWorkshop?.rich_description && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">ワークショップの詳細</h2>
            <div
              className={styles.workshopContent}
              dangerouslySetInnerHTML={{ __html: representativeWorkshop.rich_description }}
            />
          </div>
        </section>
      )}

      {/* 予約可能な日程 */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-6">
            <Calendar className="w-6 h-6 mr-2 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-900">予約可能な日程</h2>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
              <Sparkles className="w-10 h-10 text-amber-600 mx-auto mb-3" />
              <p className="text-gray-900 font-medium mb-1">現在、予約可能な日程はありません</p>
              <p className="text-gray-600 text-sm">下記フォームから開催リクエストを送ってください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/workshops/${s.workshop_id}`}
                  className="group block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-5 border border-gray-100 hover:border-purple-300"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-lg font-bold text-gray-900 mb-1">
                        <Calendar className="w-5 h-5 mr-2 text-purple-500 flex-shrink-0" />
                        {formatDateLong(s.event_date)}
                      </div>
                      <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600 ml-7">
                        {s.event_time && (
                          <span className="inline-flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-purple-400" />
                            {s.event_time.slice(0, 5)} 開始
                            {s.workshop_duration ? ` (${s.workshop_duration}分)` : ''}
                          </span>
                        )}
                        <span className="inline-flex items-center">
                          <Users className="w-4 h-4 mr-1 text-purple-400" />
                          最大{s.workshop_max_participants}名
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">参加費</div>
                        <div className="text-xl font-bold text-gray-900">¥{s.workshop_price.toLocaleString()}</div>
                      </div>
                      <div className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm font-medium group-hover:shadow-lg transition-all flex items-center">
                        予約する
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 開催リクエストフォーム */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm p-8">
          <div className="flex items-center mb-4">
            <Sparkles className="w-6 h-6 mr-2 text-amber-500" />
            <h2 className="text-2xl font-bold text-gray-900">希望の日程をリクエスト</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6">
            上記の日程が合わない方は、ご希望の日程や条件をお送りください。開催可能になりましたらメールでお知らせします。
          </p>
          <WorkshopRequestForm categorySlug={slug} />
        </div>
      </section>

      {/* 過去開催 (折りたたみ) */}
      {pastSessions.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-4xl mx-auto">
            <details className="bg-white rounded-2xl shadow-sm p-6">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-purple-600 flex items-center justify-between">
                <span>過去の開催 {pastSessions.length}回 を表示</span>
                <ArrowRight className="w-4 h-4" />
              </summary>
              <div className="mt-4 space-y-2">
                {pastSessions.slice(0, 30).map((s) => (
                  <Link
                    key={s.id}
                    href={`/workshops/${s.workshop_id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors text-sm"
                  >
                    <span className="text-gray-700">
                      {formatDateLong(s.event_date)}
                      {s.event_time && ` ${s.event_time.slice(0, 5)}〜`}
                    </span>
                    <span className="text-gray-400 truncate ml-3 max-w-[40%]">{s.workshop_title}</span>
                  </Link>
                ))}
                {pastSessions.length > 30 && (
                  <p className="text-xs text-gray-400 text-center pt-2">
                    最新30件のみ表示
                  </p>
                )}
              </div>
            </details>
          </div>
        </section>
      )}

      {/* SEO Content */}
      <section className="bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {category.name} について
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
          <div className="mt-8 text-center flex flex-wrap gap-3 justify-center">
            <Link
              href="/workshops/categories"
              className="inline-flex items-center px-6 py-3 border border-purple-300 text-purple-700 rounded-full font-medium hover:bg-purple-50 transition-all no-underline"
            >
              ← カテゴリ一覧へ戻る
            </Link>
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
