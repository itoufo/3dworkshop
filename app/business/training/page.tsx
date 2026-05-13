import Header from '@/components/Header'
import BusinessContactCta from '@/components/BusinessContactCta'
import {
  Building2,
  CheckCircle,
  Sparkles,
  Users,
  GraduationCap,
  Lightbulb,
  Target,
  Briefcase,
  Cpu,
} from 'lucide-react'
import type { Metadata } from 'next'

// SEO ターゲットキーワード:
// 企業研修 / 3Dプリンター 研修 / AI 研修 / DX研修 / 新人研修 / リスキリング
// DX人材育成 / 製造業 研修 / ものづくり研修 / プロトタイピング 研修 / 法人研修
export const metadata: Metadata = {
  title: '企業研修|AI×3Dプリンター実践研修 DX・新人研修・リスキリング | 3DLab',
  description: 'DX人材育成・新人研修・リスキリングに最適。AI×3Dプリンター実践研修。御社の課題に合わせたカスタムカリキュラム設計。少人数制・出張対応・10万円〜/人。製造業のデジタル化を加速。',
  keywords: '企業研修,3Dプリンター 研修,AI 研修,DX研修,新人研修,リスキリング,リスキル,DX人材育成,製造業 研修,ものづくり研修,プロトタイピング 研修,法人研修,生成AI 研修,デジタルファブリケーション,東京 法人研修,カスタム研修',
  alternates: {
    canonical: '/business/training',
  },
  openGraph: {
    title: '企業研修 AI×3Dプリンター | DX・新人研修・リスキリング | 3DLab',
    description: 'DX人材育成・新人研修・リスキリング向けのAI×3Dプリンター実践研修。カスタムカリキュラム。10万円〜/人。',
    url: 'https://3dlab.jp/business/training',
    siteName: '3DLab',
    locale: 'ja_JP',
    type: 'website',
    images: [{ url: 'https://3dlab.jp/og-image.jpg', width: 1200, height: 630, alt: '3DLab 企業研修' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '企業研修 AI×3Dプリンター | 3DLab',
    description: 'DX人材育成・新人研修・リスキリング。AI×3Dプリンター実践研修。10万円〜/人。',
  },
}

const FAQ_ITEMS = [
  {
    q: '何人から研修を受けられますか?',
    a: '1名からの個別研修にも対応しています。10名以上の団体研修ではスケールメリットによる割引が適用されます。最大規模は会場収容人数次第ですが、これまで30名超の研修実績もございます。',
  },
  {
    q: 'オンライン研修は可能ですか?',
    a: '実機を使う実践演習が中核のため、原則オフライン(対面)実施を推奨しています。座学パートのみオンライン、演習は対面のハイブリッド構成も対応可能です。',
  },
  {
    q: '受講者のスキルレベルはどの程度を想定していますか?',
    a: 'PC操作ができれば完全初心者でも問題ありません。経験者向けには応用カリキュラム(高度なモデリング・AI活用ワークフロー)もご用意します。事前ヒアリングで最適化します。',
  },
  {
    q: '研修後のフォローはありますか?',
    a: '研修後1ヶ月間、メールでのご質問対応をパッケージに含んでいます。社内展開のご相談・追加研修のご提案も対応します。',
  },
  {
    q: '教材や修了証は提供されますか?',
    a: '研修資料(PDF / 動画)と修了証を提供します。社内教育プログラムへの組み込みや人事評価にもご活用いただけます。',
  },
  {
    q: '出張研修と教室での研修、どちらがおすすめですか?',
    a: '少人数で機材を持ち込む手間を省きたい場合は教室(湯島駅徒歩1分)、大人数や御社設備を活用した研修なら出張をご選択ください。どちらも同じ品質で提供します。',
  },
  {
    q: '研修テーマは事前にどのように決めますか?',
    a: '初回ヒアリングで「受講者の業務」「育成目標」「課題感」をお聞きし、当社で2〜3案ご提案、修正を重ねて確定します。カリキュラム設計は基本料金に含まれます。',
  },
]

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://3dlab.jp' },
    { '@type': 'ListItem', position: 2, name: '出張・研修', item: 'https://3dlab.jp/business' },
    { '@type': 'ListItem', position: 3, name: '企業研修', item: 'https://3dlab.jp/business/training' },
  ],
}

const serviceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'AI×3Dプリンター 企業研修',
  serviceType: '法人向け実践研修(DX・リスキリング・新人研修)',
  description: 'AI×3Dプリンターのカスタムカリキュラム研修。新人研修・リスキリング・DX人材育成・プロトタイピング研修等、御社の課題に合わせ設計。',
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
  areaServed: { '@type': 'AdministrativeArea', name: '日本' },
  offers: {
    '@type': 'Offer',
    price: '100000',
    priceCurrency: 'JPY',
    description: '基本プラン(1名/1日)〜',
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

export default function BusinessTrainingPage() {
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
          <div className="inline-flex items-center bg-gradient-to-r from-pink-600 to-rose-700 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
            <Building2 className="w-4 h-4 mr-2" />
            企業研修プログラム
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              AI×3Dプリンターで<br className="sm:hidden" />DX人材を育てる実践研修
            </span>
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
            <strong>新人研修・リスキリング・DX人材育成・チームビルディング</strong>に最適な
            AI×3Dプリンター実践研修。生成AIを使った3Dモデリング、プロトタイピング、デジタルファブリケーションを
            御社のニーズに合わせたカスタムカリキュラムで提供します。
          </p>
        </div>
      </section>

      {/* 研修の特徴 */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            3DLab 企業研修の特徴
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">完全カスタム カリキュラム設計</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                参加者のスキル・業務領域・育成ゴールに合わせ、カリキュラムを一から設計。
                既製プログラムの押し付けは一切ありません。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl flex items-center justify-center mb-4">
                <Cpu className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">AI×ものづくり最前線の実務知識</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                生成AIで3Dモデリング、形状最適化、量産設計。
                製造業・スタートアップの現場で使える最新AI活用ノウハウを実践的に学べます。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl flex items-center justify-center mb-4">
                <Lightbulb className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">手を動かす実践型ワーク</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                座学だけでは身につきません。研修当日に必ず作品を完成させる
                「作って持ち帰る」演習を必ず組み込みます。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">少人数制で深い理解</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                1〜10名の少人数で講師が一人ひとりに寄り添う形式。
                質問にもしっかり対応、受講者の理解度を最大化します。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl flex items-center justify-center mb-4">
                <Briefcase className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">出張 / 教室 両対応</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                御社へ機材持参の出張研修、または当社教室(湯島駅徒歩1分)での研修
                どちらの形式にも対応可能です。
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-600 to-rose-700 rounded-2xl flex items-center justify-center mb-4">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">修了証と1ヶ月メールサポート</h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                受講後1ヶ月のメール質問対応と修了証を発行。
                研修内容の社内展開を継続的にサポートします。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* カリキュラム例 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-pink-100 to-purple-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            カリキュラム例
          </h2>
          <p className="text-center text-gray-600 mb-12">
            新人研修からDX人材育成、チームビルディングまで。組み合わせ・部分採用も自由です
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <article className="bg-white rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5">
                <p className="text-xs text-white/80 font-medium mb-1">BEGINNER</p>
                <h3 className="text-xl font-bold text-white">新人・基礎研修</h3>
                <p className="text-sm text-white/90 mt-1">所要 3〜6時間</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />3Dプリント基礎・素材特性</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />生成AIで3Dモデルを作る体験</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />スライサー操作・プリント実演</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />オリジナル作品の制作・持ち帰り</li>
                </ul>
                <p className="text-xs text-purple-700 mt-4 pt-3 border-t border-gray-100">対象: 新人・若手・未経験者</p>
              </div>
            </article>

            <article className="bg-white rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-pink-600 to-rose-700 p-5">
                <p className="text-xs text-white/80 font-medium mb-1">INTERMEDIATE</p>
                <h3 className="text-xl font-bold text-white">DX・リスキリング</h3>
                <p className="text-sm text-white/90 mt-1">所要 1〜2日</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0" />業務に活用する3Dプリンター事例研究</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0" />AI活用(生成AI / モデリング自動化)</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0" />プロトタイプ・治具・ノベルティ製作</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-pink-500 mr-2 mt-0.5 flex-shrink-0" />課題発見ワークと解決提案演習</li>
                </ul>
                <p className="text-xs text-pink-700 mt-4 pt-3 border-t border-gray-100">対象: 設計・企画・DX推進部門</p>
              </div>
            </article>

            <article className="bg-white rounded-3xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-rose-700 to-purple-700 p-5">
                <p className="text-xs text-white/80 font-medium mb-1">TEAM</p>
                <h3 className="text-xl font-bold text-white">チームビルディング</h3>
                <p className="text-sm text-white/90 mt-1">所要 半日〜1日</p>
              </div>
              <div className="p-6">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-rose-500 mr-2 mt-0.5 flex-shrink-0" />チーム共同制作のお題設定</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-rose-500 mr-2 mt-0.5 flex-shrink-0" />役割分担・アイデア発散ワーク</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-rose-500 mr-2 mt-0.5 flex-shrink-0" />AIでアイデアを形にする実践</li>
                  <li className="flex items-start"><CheckCircle className="w-4 h-4 text-rose-500 mr-2 mt-0.5 flex-shrink-0" />チーム作品の発表・振り返り</li>
                </ul>
                <p className="text-xs text-rose-700 mt-4 pt-3 border-t border-gray-100">対象: 部署横断チーム・新メンバー融合</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 想定企業 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            こんな企業様にご利用いただいています
          </h2>
          <p className="text-center text-gray-600 mb-12">
            製造業のDX、スタートアップの試作、人材育成部門の研修メニュー強化など
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '製造業の新人・若手社員', desc: 'デジタルものづくり基礎の習得、設計部門のリスキリング・DX対応' },
              { title: 'マーケティング・企画部門', desc: 'プロトタイピングとAI活用でアイデアを高速に形にする' },
              { title: 'スタートアップ', desc: 'ハードウェア試作・PoC内製化スキルの獲得' },
              { title: '教育・人材育成担当者', desc: '社員研修プログラムの新規メニュー導入、研修設計の相談' },
              { title: '広報・ブランド戦略部', desc: '社内チームビルディング+情報発信ネタとしての活用' },
              { title: 'IT/DX推進部門', desc: 'AI×ものづくり最新動向の社内展開、デジタル人材育成' },
            ].map((item, i) => (
              <article key={i} className="flex items-start bg-white rounded-2xl p-5 shadow-sm">
                <Sparkles className="w-5 h-5 text-pink-500 mr-3 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 料金 */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">料金</h2>
          <p className="text-center text-gray-600 mb-8">基本プラン(1日 / 1名あたり)</p>

          <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-8 text-center">
            <div className="flex items-baseline justify-center">
              <span className="text-6xl font-bold text-pink-700">10</span>
              <span className="text-3xl font-bold text-pink-700">万円</span>
              <span className="text-gray-500 ml-2 text-xl">〜 / 人</span>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              ※研修内容・人数・日数により変動します
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <h3 className="font-bold text-gray-900 mb-3">含まれるもの</h3>
            {[
              'カスタム研修カリキュラム設計',
              '研修当日の運営・講義',
              '3Dプリンター・PC・材料一式',
              '受講者の作品制作と持ち帰り',
              '修了証発行',
              '研修後1ヶ月のメール質問対応',
            ].map((item, i) => (
              <div key={i} className="flex items-start text-gray-700">
                <CheckCircle className="w-5 h-5 text-pink-600 mr-3 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
            <strong>※ 大人数研修</strong> 10名を超える場合はスケールメリットで割引いたします。お気軽にご相談ください。
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
                  <span className="text-pink-600 mr-2 flex-shrink-0">Q.</span>
                  <span>{item.q}</span>
                </summary>
                <div className="mt-4 pl-7 text-gray-600 text-sm leading-relaxed">
                  <span className="text-purple-600 font-bold mr-1">A.</span>
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
