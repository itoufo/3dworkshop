import Header from '@/components/Header'
import BusinessContactCta from '@/components/BusinessContactCta'
import {
  MapPin,
  CheckCircle,
  Sparkles,
  Users,
  Calendar,
  Building2,
  Truck,
  Camera,
  Zap,
} from 'lucide-react'
import type { Metadata } from 'next'

// SEO ターゲットキーワード:
// 出張イベント / 出張ワークショップ / 3Dプリンター 体験 / 採用イベント / 体験ブース
// 展示会 ブース / ファミリーデー 企画 / 親子イベント / 集客イベント / STEM 体験
export const metadata: Metadata = {
  title: '出張イベント企画|3Dプリンター体験ブース 採用・展示会・ファミリーデー対応 | 3DLab',
  description: '採用イベント・展示会・社内ファミリーデーに3Dプリンター体験ブースを出張設営。機材一式持参、専任スタッフ運営、企画提案までワンストップ。東京23区出張費込み15万円〜。',
  keywords: '出張イベント,出張ワークショップ,3Dプリンター 体験,3Dプリンター イベント,採用イベント,体験ブース,展示会 ブース,ファミリーデー 企画,親子イベント,集客 イベント,STEM 体験,体験型 イベント,東京 出張ワークショップ,会社説明会 企画,内定者イベント',
  alternates: {
    canonical: '/business/event',
  },
  openGraph: {
    title: '出張イベント企画 | 3Dプリンター体験ブース | 3DLab',
    description: '採用イベント・展示会・ファミリーデーに3Dプリンター体験ブースを出張設営。15万円〜。',
    url: 'https://3dlab.jp/business/event',
    siteName: '3DLab',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: 'https://3dlab.jp/og-image.jpg', width: 1200, height: 630, alt: '3DLab 出張イベント' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '出張イベント | 3Dプリンター体験ブース | 3DLab',
    description: '採用イベント・展示会・ファミリーデーに3Dプリンター体験ブース。15万円〜。',
  },
}

const FAQ_ITEMS = [
  {
    q: '対応エリアはどこまでですか?',
    a: '東京23区内は基本料金に出張費を含みます。それ以外の関東圏は別途お見積りで対応可能です。遠方の場合もまずはご相談ください。',
  },
  {
    q: '事前に準備するものは何ですか?',
    a: '体験ブース用の電源(コンセント2口程度)と配置スペース(約3m × 3m)のみご用意ください。3Dプリンター、PC、フィラメント、テーブル等は当社で持ち込みます。',
  },
  {
    q: '何人くらいの来場者規模が最適ですか?',
    a: '来場者30名〜500名規模のイベントが特に適しています。一人あたりの体験時間は15〜30分を想定し、機材台数とスタッフ人数で同時対応人数を調整します。',
  },
  {
    q: 'どのくらい前に申し込めばよいですか?',
    a: '余裕を持って1ヶ月前のご相談を推奨します。最短2週間前でも対応可能な場合がありますので、まずはお問い合わせください。',
  },
  {
    q: '体験プログラムはどのようにカスタマイズできますか?',
    a: '採用イベントなら企業ロゴ入りキーホルダー、ファミリーデーなら親子で作る作品など、テーマに合わせて完全カスタマイズします。企画段階からご相談ください。',
  },
  {
    q: '採用イベントでの活用事例はありますか?',
    a: 'インターンシップでの体験ブース、内定者懇親会でのチーム制作、合同会社説明会でのブランドアピールなど、多数の活用実績があります。',
  },
]

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://3dlab.jp' },
    { '@type': 'ListItem', position: 2, name: '出張・研修', item: 'https://3dlab.jp/business' },
    { '@type': 'ListItem', position: 3, name: '出張イベント', item: 'https://3dlab.jp/business/event' },
  ],
}

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: '3Dプリンター体験 出張イベント',
  serviceType: 'イベント出張・体験ブース運営',
  description: '採用イベント・展示会・社内ファミリーデー等に3Dプリンター体験ブースを出張設営し、機材一式と専任スタッフで運営するサービス。',
  provider: {
    '@type': 'LocalBusiness',
    name: '3DLab',
    telephone: '+81-80-9453-0911',
    email: 'y-sato@sunu25.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '湯島3-14-8 加田湯島ビル 5F',
      addressLocality: '文京区',
      addressRegion: '東京都',
      postalCode: '113-0034',
      addressCountry: 'JP',
    },
    url: 'https://3dlab.jp',
  },
  areaServed: { '@type': 'AdministrativeArea', name: '東京都・関東圏' },
  offers: {
    '@type': 'Offer',
    price: '150000',
    priceCurrency: 'JPY',
    description: '1日プラン(プリンター2台/スタッフ2名)〜',
  },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((it) => ({
    '@type': 'Question',
    name: it.q,
    acceptedAnswer: { '@type': 'Answer', text: it.a },
  })),
}

export default function BusinessEventPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
            <MapPin className="w-4 h-4 mr-2" />
            出張イベント企画
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              3Dプリンター体験ブースを<br className="sm:hidden" />御社のイベントへ出張設営
            </span>
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
            採用イベント・展示会・社内ファミリーデー・地域イベントに、機材一式と専任スタッフを持ち込み。
            来場者が触れて・作って・持ち帰れる<strong>体験型ブース</strong>を企画から運営まで丸ごとお任せいただけます。
          </p>
        </div>
      </section>

      {/* 選ばれる理由 */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            選ばれる3つの理由
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">機材一式まるごと出張</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                3Dプリンター本体・PC・フィラメント・電源タップ・テーブル等、必要な機材を一式お持ちします。
                電源とスペースだけご用意いただければOK。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">専任スタッフが当日運営</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                3DプリンターとAI×ものづくりに精通したスタッフが来場者対応を担当。
                体験誘導・質問対応・トラブル時のフォローまですべてお任せください。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">イベント企画から提案</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                ご来場者の年齢層・テーマ・所要時間に合わせて体験プログラムをカスタマイズ。
                企画段階からご一緒に練り上げます。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* シーン別活用例 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100 to-pink-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            こんなイベントに最適です
          </h2>
          <p className="text-center text-gray-600 mb-12">
            集客力アップ・体験価値向上を狙うあらゆる企業イベントで活用いただけます
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: '採用イベント・会社説明会', desc: '学生・若手層の興味を引きつける先進性アピール体験。インターンシップ・内定者懇親会にも', kw: '採用イベント / 会社説明会' },
              { icon: Calendar, title: 'ファミリーデー・社員旅行', desc: '社員家族の子供から大人まで楽しめる思い出体験。親子イベントの目玉企画に', kw: 'ファミリーデー / 親子イベント' },
              { icon: Building2, title: '展示会・商業施設イベント', desc: '集客力アップにつながる体験型ブース。立ち止まらせる導線設計まで', kw: '展示会 ブース / 商業施設' },
              { icon: MapPin, title: '地域・自治体イベント', desc: 'STEM教育・地域活性化プログラムの目玉企画として。学校・行政との連携実績多数', kw: 'STEM 体験 / 地域イベント' },
              { icon: Camera, title: 'ブランドプロモーション', desc: 'ブランドロゴ入りグッズを来場者の目の前で制作・配布。SNS拡散にも最適', kw: 'ノベルティ / プロモーション' },
              { icon: Zap, title: 'PR・メディアイベント', desc: '映える体験コンテンツで記事化・SNS拡散を後押し。報道価値ある仕掛けに', kw: 'PR / メディア露出' },
            ].map((item, i) => (
              <article key={i} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-2">{item.desc}</p>
                <p className="text-xs text-purple-600 font-medium">▶ {item.kw}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 当日の流れ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            ご依頼から当日までの流れ
          </h2>
          <ol className="space-y-4">
            {[
              { step: 1, title: 'お問い合わせ・ヒアリング', desc: 'お電話 / メールで概要をお聞かせください。日程・場所・人数規模・ご予算をヒアリングします' },
              { step: 2, title: '企画・お見積りのご提案', desc: 'イベントテーマに合わせた体験プログラムと機材構成、料金を3営業日以内にご提案' },
              { step: 3, title: 'ご契約・事前準備', desc: '内容確定後にご契約。事前にスタッフが会場の配置・電源等を確認し、当日の運営フローを設計' },
              { step: 4, title: '当日: 設営〜運営〜撤収', desc: '開場前に到着して機材設営。運営はすべて当社スタッフが担当。終了後の撤収まで完結' },
            ].map((s) => (
              <li key={s.step} className="flex items-start bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center font-bold text-lg mr-4">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{s.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 料金 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">料金</h2>
          <p className="text-center text-gray-600 mb-8">標準プラン(1日 / プリンター2台 / スタッフ2名 / 東京23区内)</p>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 text-center">
            <div className="flex items-baseline justify-center">
              <span className="text-6xl font-bold text-purple-700">15</span>
              <span className="text-3xl font-bold text-purple-700">万円</span>
              <span className="text-gray-500 ml-2 text-xl">〜</span>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              ※開催日数・規模・機材台数・スタッフ数により変動します
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="font-bold text-gray-900 mb-3">含まれるもの</h3>
            {[
              '3Dプリンター本体・PC・フィラメント等の機材一式',
              '専任スタッフによる現地運営',
              '体験プログラム企画・カスタマイズ',
              '機材の搬入・設営・撤収',
              '事前打ち合わせ・当日の運営サポート',
            ].map((item, i) => (
              <div key={i} className="flex items-start text-gray-700">
                <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <strong>※ 出張費</strong> 東京23区内は基本料金に含みます。それ以外のエリアは別途お見積り。
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            よくあるご質問
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="bg-white rounded-2xl shadow-sm p-6 group">
                <summary className="cursor-pointer font-bold text-gray-900 flex items-start">
                  <span className="text-purple-600 mr-2 flex-shrink-0">Q.</span>
                  <span>{item.q}</span>
                </summary>
                <div className="mt-4 pl-7 text-gray-600 text-sm leading-relaxed">
                  <span className="text-pink-600 font-bold mr-1">A.</span>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <BusinessContactCta />
    </div>
  )
}
