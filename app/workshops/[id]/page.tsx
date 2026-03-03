import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import { Sparkles, Shield, Heart, Users, ArrowLeft, FolderOpen, Calendar } from 'lucide-react'
import { getWorkshop, getRelatedWorkshops } from '@/lib/workshops'
import { StructuredData, WorkshopEventSchema } from '@/components/StructuredData'
import { Breadcrumb } from '@/components/Breadcrumb'
import { optimizeImageUrl } from '@/lib/image-optimization'
import WorkshopBookingSection from '@/components/WorkshopBookingSection'
import { notFound } from 'next/navigation'
import styles from './workshop.module.css'

export const revalidate = 3600

export default async function WorkshopDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workshop = await getWorkshop(id)

  if (!workshop) {
    notFound()
  }

  // Check if past workshop
  let isPastWorkshop = false
  if (workshop.event_date) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    isPastWorkshop = new Date(workshop.event_date) < today
  }

  // Fetch related workshops
  const relatedWorkshops = workshop.category_id
    ? await getRelatedWorkshops(workshop.id, workshop.category_id)
    : []

  return (
    <>
      <StructuredData data={WorkshopEventSchema(workshop)} />
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <Header />

        {/* Breadcrumb and Back Button */}
        <div className="pt-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <Breadcrumb
              items={[
                { name: 'ワークショップ', href: '/workshops' },
                ...(workshop.category ? [{ name: workshop.category.name, href: `/workshops/category/${workshop.category.slug}` }] : []),
                { name: workshop.title, href: `/workshops/${workshop.id}` }
              ]}
            />
            {/* Category Tag */}
            {workshop.category && (
              <div className="mb-4">
                <Link
                  href={`/workshops/category/${workshop.category.slug}`}
                  className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors"
                >
                  <FolderOpen className="w-3 h-3 mr-1" />
                  {workshop.category.name}
                </Link>
              </div>
            )}
            <Link
              href="/workshops"
              className="flex items-center text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              一覧に戻る
            </Link>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - Workshop Details (Server-rendered) */}
            <div className="lg:col-span-2">
              {/* Image */}
              {workshop.image_url ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-8">
                  <Image
                    src={optimizeImageUrl(workshop.image_url)}
                    alt={`${workshop.title} - 3Dプリンタワークショップ 東京・湯島 | 3DLab`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 66vw"
                    priority
                    fetchPriority="high"
                  />
                </div>
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-8">
                  <div className="w-32 h-32 bg-white/50 rounded-xl flex items-center justify-center">
                    <span className="text-5xl font-bold text-purple-600">3D</span>
                  </div>
                </div>
              )}

              {/* Title and Description */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{workshop.title}</h1>
                <p className="text-lg text-gray-600">{workshop.description}</p>
              </div>

              {/* Rich Description */}
              {workshop.rich_description && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">ワークショップの詳細</h2>
                  <div
                    className={styles.workshopContent}
                    dangerouslySetInnerHTML={{ __html: workshop.rich_description }}
                  />
                </div>
              )}

              {/* Features */}
              <div className="bg-purple-50 rounded-2xl p-8 mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">このワークショップの特徴</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">初心者歓迎</h4>
                      <p className="text-sm text-gray-600">基礎から丁寧に指導します</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">安全対策</h4>
                      <p className="text-sm text-gray-600">機器の安全な使い方を学べます</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">作品は後日発送</h4>
                      <p className="text-sm text-gray-600">制作した作品は後日発送いたします</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">少人数制</h4>
                      <p className="text-sm text-gray-600">一人ひとりに寄り添った指導</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Access Section */}
              <div className="bg-white rounded-2xl shadow-xl p-8 mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6">アクセス</h3>

                {/* Map */}
                <div className="rounded-xl overflow-hidden shadow-md h-64 mb-6">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3240.0302599999997!2d139.7671258!3d35.7051736!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188ea6490c7a0b%3A0xf7e6918f7f01c837!2z5qCq5byP5Lya56S-44Km44Kp44O844Kr44O8!5e0!3m2!1sja!2sjp!4v1736922000000!5m2!1sja!2sjp"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={true}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="3DLabの地図"
                  />
                </div>

                {/* Address */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <h4 className="font-bold text-gray-900 mb-2">📍 3DLab</h4>
                  <address className="not-italic text-gray-700">
                    <p className="text-sm">〒113-0034</p>
                    <p>東京都文京区湯島3-14-8</p>
                    <p>加田湯島ビル 5F</p>
                  </address>
                </div>

                {/* Station Access */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <span>🚇</span>
                    <span className="text-gray-700">東京メトロ千代田線 湯島駅 3番出口から徒歩1分</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span>🚃</span>
                    <span className="text-gray-700">JR御徒町駅 南口から徒歩8分</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span>🚇</span>
                    <span className="text-gray-700">JR秋葉原駅 電気街口から徒歩10分</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span>🚉</span>
                    <span className="text-gray-700">丸ノ内線 御茶ノ水駅 聖橋口から徒歩12分</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Booking (Client Component) */}
            <div className="lg:col-span-1">
              <WorkshopBookingSection
                workshop={workshop}
                relatedWorkshops={relatedWorkshops}
                isPastWorkshop={isPastWorkshop}
              />
            </div>
          </div>

          {/* Related Workshops Section (for non-past workshops) */}
          {!isPastWorkshop && relatedWorkshops.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">関連ワークショップ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {relatedWorkshops.map((rw) => (
                  <Link
                    key={rw.id}
                    href={`/workshops/${rw.id}`}
                    className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    {rw.image_url ? (
                      <div className="relative w-full aspect-video overflow-hidden bg-gray-100">
                        <Image
                          src={optimizeImageUrl(rw.image_url, 75)}
                          alt={rw.title}
                          fill
                          className="object-contain group-hover:scale-105 transition-transform duration-300"
                          sizes="33vw"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-600">3D</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-1">{rw.title}</h3>
                      {rw.event_date && (
                        <p className="text-sm text-gray-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-purple-500" />
                          {new Date(rw.event_date).toLocaleDateString('ja-JP', {
                            month: 'long', day: 'numeric', weekday: 'short'
                          })}
                        </p>
                      )}
                      <p className="text-lg font-bold text-gray-900 mt-2">¥{rw.price.toLocaleString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
