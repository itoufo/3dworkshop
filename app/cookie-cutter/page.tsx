import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CookieCutterStudio from '@/components/CookieCutterStudio'
import { CUTTER_DOWNLOAD_PRICE, CUTTER_PRINT_PRICE } from '@/lib/cookie-cutter/pricing'

const SITE_URL = 'https://3dlab.jp'

export const metadata: Metadata = {
  title: 'オリジナルクッキー型メーカー｜描いた絵がそのままクッキー型に',
  description:
    'お子さんの絵・ロゴ・SVG をアップロード、名前を入力、アイコンから選ぶ。どれでもオリジナルのクッキー型データが作れます。その場で3Dプレビュー。データのダウンロードも、印刷しての発送も承ります。',
  alternates: { canonical: `${SITE_URL}/cookie-cutter` },
  openGraph: {
    title: 'オリジナルクッキー型メーカー｜3DLab',
    description: '絵・SVG・名前・アイコンから、世界にひとつのクッキー型。その場で3Dプレビュー。',
    url: `${SITE_URL}/cookie-cutter`,
    type: 'website',
  },
}

export default function CookieCutterPage() {
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'オリジナルクッキー型メーカー', item: `${SITE_URL}/cookie-cutter` },
    ],
  }

  const productData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'オリジナルクッキー型',
    description: 'アップロードした絵から作る、世界にひとつのクッキー型。3Dプリント用データまたは印刷済みの実物。',
    brand: { '@type': 'Brand', name: '3DLab' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'JPY',
      lowPrice: CUTTER_DOWNLOAD_PRICE,
      highPrice: CUTTER_PRINT_PRICE,
      offerCount: 2,
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productData) }}
      />
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              描いた絵が、そのままクッキー型に
            </h1>
            <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto">
              絵やロゴをアップロードするほか、<strong>名前を入力する</strong>だけ、
              <strong>アイコンから選ぶ</strong>だけでも作れます。その場で3Dの型ができるので、
              焼く前に形を確かめられます。
              データだけ買って自分で印刷しても、こちらで印刷してお送りすることもできます。
            </p>
          </header>

          <CookieCutterStudio />

          <section className="mt-16 bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">よくあるご質問</h2>
            <dl className="space-y-6">
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">どんな絵が向いていますか？</dt>
                <dd className="text-base text-gray-700">
                  白い紙に濃いペンで描いた、閉じた輪郭の絵が一番きれいに出ます。
                  細い線が交差している絵や、影のついた写真は形が取りにくいことがあります。
                  うまくいかないときは「線のすき間を埋める」と「なめらかさ」を上げてみてください。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">SVGも使えますか？</dt>
                <dd className="text-base text-gray-700">
                  使えます。イラストソフトで作った SVG をそのままアップロードしてください（2MBまで）。
                  塗りの色は問いません。線だけで描かれた図形も、囲まれた内側を塗りつぶした形として型にします。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">名前の型は作れますか？</dt>
                <dd className="text-base text-gray-700">
                  「文字」から作れます。1文字ずつが刃になり、平らなふちで1枚につながった形になります。
                  文字数に合わせて大きさを自動で決めますが、
                  「形が離れていてひとつの型になりません」と出たときは、字間を詰めるか「ふちの幅」を広げてください。<br />
                  細い書体は刃どうしがくっついて生地が抜けないので、太い書体をおすすめします。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">アイコンは自由に使えますか？</dt>
                <dd className="text-base text-gray-700">
                  アイコンは Font Awesome（CC BY 4.0）のものです。ご自身で焼いて楽しむぶんには制限ありませんが、
                  アイコンをもとにした型や、それで作ったクッキーを販売する場合は、
                  出典の表示（Font Awesome / CC BY 4.0）が必要です。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">データはどの形式ですか？</dt>
                <dd className="text-base text-gray-700">
                  STL形式です。一般的なスライサーソフト（PrusaSlicer、Cura、Bambu Studio など）で開けます。
                  ふちを下にして置けばサポート材なしで印刷できる向きで書き出しています。
                  ノズル0.4mm・積層0.2mm を想定しています。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">食品に使って大丈夫ですか？</dt>
                <dd className="text-base text-gray-700">
                  3Dプリントした造形物は積層のすき間に汚れが残りやすく、食品衛生上の管理はご自身の判断でお願いしています。
                  生地に直接触れる時間を短くし、使用後はよく洗って乾かしてください。食器洗い乾燥機や熱湯は変形の原因になります。
                </dd>
              </div>
              <div>
                <dt className="text-xl font-bold text-gray-900 mb-1">返品はできますか？</dt>
                <dd className="text-base text-gray-700">
                  データは性質上、ご購入後の返金をお受けできません。
                  印刷してお送りするものは一点ずつのオーダーメイドのため、お支払い後のキャンセルをお受けできません。
                  届いた品物に破損や不良があった場合は交換いたしますので、お問い合わせください。
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
