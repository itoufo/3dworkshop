import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Heart, Shield, Sparkles, Users } from 'lucide-react'
import Header from '@/components/Header'
import EnglishFooter from '@/components/en/EnglishFooter'
import EnglishAccess, { EN_ADDRESS_LINES } from '@/components/en/EnglishAccess'
import WorkshopBookingSectionLazy from '@/components/WorkshopBookingSectionLazy'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { optimizeRichContentImages } from '@/lib/rich-content'
import styles from '@/app/workshops/[id]/workshop.module.css'
import type { Workshop } from '@/types'

const FEATURES = [
  { icon: Sparkles, title: 'Beginners welcome', body: 'No experience with AI, design, or 3D printing needed. We guide you step by step.' },
  { icon: Shield, title: 'Safety first', body: 'Learn how to use the equipment safely.' },
  { icon: Heart, title: 'Your figure is mailed to you', body: 'Your finished piece is printed after the workshop and sent to an address in Japan.' },
  { icon: Users, title: 'Small groups', body: 'Small classes so instructors can help each person.' },
]

/**
 * 英語ページのワークショップ詳細（/en/workshops/[id]）。
 * タイトル・説明文・詳細本文は DB の値をそのまま出す（英語ページに載せるワークショップは英語で書く運用）。
 * 予約フォームは日本語ページと同じ部品を locale="en" で使う（サーバー側の確認はすべて共通）。
 */
export default function EnglishWorkshopDetailView({ workshop }: { workshop: Workshop }) {
  const { preview_password: _previewPassword, ...safeWorkshop } = workshop
  // 予約フォームの「場所」欄は DB の日本語住所なので、湯島の教室なら英語表記に置き換えて渡す
  const isYushima = !workshop.location || workshop.location.includes('湯島')
  const bookingWorkshop: Workshop = isYushima
    ? { ...safeWorkshop, location: `3DLab, ${EN_ADDRESS_LINES.join(', ')}` }
    : safeWorkshop

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <div className="pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/en/workshops"
            className="inline-flex items-center text-base text-gray-600 hover:text-purple-600 font-medium transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden />
            All workshops
          </Link>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 min-w-0">
            {workshop.image_url && (
              <div className="w-full rounded-2xl overflow-hidden mb-8 bg-gray-100">
                <Image
                  src={optimizeImageUrl(workshop.image_url)}
                  alt={`${workshop.title} — 3DLab, Tokyo`}
                  width={1536}
                  height={1024}
                  className="w-full h-auto"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                  fetchPriority="high"
                />
              </div>
            )}

            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{workshop.title}</h1>
              {workshop.description && <p className="text-lg text-gray-600">{workshop.description}</p>}
            </div>

            {workshop.rich_description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">About this workshop</h2>
                {/* ⚠ 本文中の画像（editor-image）はエディタが style="max-width: 500px" を直書きするため、スマホでは幅を超えて横スクロールになる。! で幅に収める。
                    日本語ページ（WorkshopDetailView）にも同じ問題があるが、ここでは英語ページだけ直している */}
                <div
                  className={`${styles.workshopContent} [&_img]:max-w-full! [&_img]:h-auto`}
                  dangerouslySetInnerHTML={{ __html: optimizeRichContentImages(workshop.rich_description) }}
                />
              </div>
            )}

            {workshop.show_features !== false && (
              <div className="bg-purple-50 rounded-2xl p-6 sm:p-8 mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Highlights</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {FEATURES.map(({ icon: Icon, title, body }) => (
                    <div key={title} className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-purple-600" aria-hidden />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{title}</h3>
                        <p className="text-base text-gray-600">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isYushima ? (
              <EnglishAccess headingLevel="h3" />
            ) : (
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Venue</h3>
                <p className="text-base text-gray-700" lang="ja">{workshop.location}</p>
                <p className="mt-3 text-base text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  This workshop is held at a different venue from our usual studio in Yushima.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <WorkshopBookingSectionLazy workshop={bookingWorkshop} relatedWorkshops={[]} isPastWorkshop={false} locale="en" />
          </div>
        </div>
      </main>
      <EnglishFooter />
    </div>
  )
}
