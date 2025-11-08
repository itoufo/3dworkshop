import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import { Sparkles, Box, Printer, Users, ArrowRight, Rocket, Star } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main>
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 md:pb-24 px-4 sm:px-6 lg:px-8" aria-label="メインビジュアル">
        {/* 背景画像 */}
        <div className="absolute inset-0">
          <Image
            src="/hero-bg.jpg"
            alt="3Dプリンタ教室 3DLab 東京・湯島 - 最新の3Dプリンタと熟練のチームが揃うクリエイティブスタジオ"
            fill
            className="object-cover opacity-40"
            priority
            quality={90}
          />
        </div>
        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/90 via-white/80 to-pink-50/90 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="mt-6 text-4xl sm:text-4xl font-bold text-gray-900 leading-tight">
                秋葉原の3Dプリンタ教室<br className="hidden sm:inline" />
                頭の中のアイデアを手に取れるカタチに
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
                3DLabは最新の3Dプリンタと熟練のチームが揃う、東京・湯島のクリエイティブスタジオです。
                <strong className="text-purple-700">子どもも大人も楽しめる</strong>ワークショップから、企業のプロトタイプ制作、本格的なモノづくりまで。
                <strong className="text-purple-700">AIも3Dプリンタも一緒に学び</strong>、家族で<strong className="text-purple-700">思い出作り</strong>。
                あなたのアイデアを立体化する、すべてのプロセスをサポートします。
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/workshops"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-xl transition-transform hover:-translate-y-0.5"
                >
                  ワークショップを見る
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  href="/school"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-purple-200 bg-white text-purple-700 font-semibold hover:bg-purple-50 transition-colors"
                >
                  スクールについて知る
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/40 via-white/20 to-pink-400/40 blur-3xl" />
              <div className="relative rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-2xl p-2">
                <div className="flex justify-center mb-8">
                  <Image
                    src="/logo.png"
                    alt="3DLab - 3Dプリンタ教室 東京・湯島"
                    width={320}
                    height={120}
                    className="h-24 w-auto"
                    priority
                    quality={90}
                  />
                </div>
                <div className="grid gap-6">
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-100 to-white border border-purple-200/60">
                    <div className="flex items-center mb-3">
                      <Sparkles className="w-5 h-5 text-purple-500 mr-3" />
                      <p className="text-sm font-semibold text-purple-600 uppercase tracking-widest">
                        Creative Experience
                      </p>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      湯島のスタジオで、アイデアを立体化する楽しさを体感。観る、触れる、つくるプロセスを通じて、新しい発想と可能性が広がります。
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white hidden md:block">
                        <Printer className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 ">最先端の設備</h3>
                        <p className="text-sm text-gray-500">
                          業務用3Dプリンタと多彩な素材で、プロ品質の造形を実現。試作から量産まで対応可能。
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center text-white hidden md:block">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">プロが伴走</h3>
                        <p className="text-sm text-gray-500">
                          3Dモデリングから造形、仕上げまで、経験豊富なスタッフが一貫してサポート。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-10 lg:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            あらゆるシーンで、3Dを活用
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            「3Dプリンタでどこまでできるの？」という疑問に、リアルな体験とプロの技術でお応えします。
            新製品のプロトタイプ、展示会の装飾、採用イベントのノベルティ、教育プログラムでの実習など、
            あらゆる場面で3Dプリンティングの可能性を最大限に引き出します。
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-3xl bg-white border border-purple-100 shadow-lg p-8 flex flex-col">
            <Box className="w-12 h-12 text-purple-600 mb-6 hidden md:block" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">体験設計</h3>
            <p className="text-gray-600 flex-1">
              展示会やイベントでの3D体験を企画・設計。来場者が実際に触れて、驚きと感動を味わえる、印象に残る演出を創造します。
            </p>
            <Link
              href="/portfolio"
              className="mt-6 inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              実績を見る
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="rounded-3xl bg-white border border-purple-100 shadow-lg p-8 flex flex-col">
            <Printer className="w-12 h-12 text-purple-600 mb-6 hidden md:block" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">造形・プロトタイピング</h3>
            <p className="text-gray-600 flex-1">
              試作品から小ロット生産まで、スピーディーに対応。最適な素材選定、後処理、品質管理まで、プロ仕様の造形をワンストップでご提供します。
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              サービス詳細
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="rounded-3xl bg-white border border-purple-100 shadow-lg p-8 flex flex-col">
            <Rocket className="w-12 h-12 text-purple-600 mb-6 hidden md:block" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">共創ワークショップ</h3>
            <p className="text-gray-600 flex-1">
              <span className="font-semibold text-purple-700">子どもも大人も楽しめる</span>体験会から、企業研修、チームビルディングまで。
              <span className="font-semibold text-purple-700">AIも3Dプリンタも一緒に学び</span>、家族で<span className="font-semibold text-purple-700">思い出作り</span>。
              3Dプリンティングを通じて、創造性を引き出し、新しいアイデアを生み出す場を創ります。
            </p>
            <Link
              href="/workshops"
              className="mt-6 inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              予約ページへ
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>


      {/* Quick Links Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            サービスメニュー
          </h2>
          <nav className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto" aria-label="サービスナビゲーション">
            <Link
              href="/workshops"
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-center group "
            >
              <div className="text-3xl mb-3 ">🎓</div>
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-purple-600 transition-colors">ワークショップ</h3>
              <p className="text-sm text-gray-500 mt-2">体験・学習</p>
            </Link>
            <Link
              href="/school"
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow text-center group"
            >
              <div className="text-3xl mb-3">🏫</div>
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-purple-600 transition-colors">スクール</h3>
              <p className="text-sm text-gray-500 mt-2">本格的に学ぶ</p>
            </Link>
          </nav>
        </div>
      </section>

      {/* Access */}
      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            アクセス
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="rounded-2xl overflow-hidden shadow-lg h-96">
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

            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl">
                <h3 className="font-bold text-lg mb-4 text-gray-900">📍 3DLab</h3>
                <address className="not-italic space-y-2 text-gray-700">
                  <p className="font-medium">
                    〒113-0034
                  </p>
                  <p className="text-lg">
                    東京都文京区湯島3-14-8<br />
                    加田湯島ビル 5F
                  </p>
                </address>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900">電車でのアクセス</h4>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🚇</span>
                    <div>
                      <p className="font-medium text-gray-900">東京メトロ千代田線 湯島駅</p>
                      <p className="text-sm text-gray-600">3番出口から徒歩1分</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🚃</span>
                    <div>
                      <p className="font-medium text-gray-900">JR山手線・京浜東北線 御徒町駅</p>
                      <p className="text-sm text-gray-600">南口から徒歩8分</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🚇</span>
                    <div>
                      <p className="font-medium text-gray-900">JR総武線・日比谷線 秋葉原駅</p>
                      <p className="text-sm text-gray-600">電気街口から徒歩10分</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-2xl">🚉</span>
                    <div>
                      <p className="font-medium text-gray-900">丸ノ内線 御茶ノ水駅</p>
                      <p className="text-sm text-gray-600">聖橋口から徒歩12分</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">3D</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">3Dプリンタ教室 3DLab</h3>
            <p className="text-sm text-gray-400">
              東京都文京区湯島3-14-8 加田湯島ビル 5F
            </p>
            <p className="text-sm text-gray-400">
              湯島駅・御徒町駅・秋葉原駅・御茶ノ水駅 からアクセス可能
            </p>
          </div>

          <div className="border-t border-gray-800 pt-6 mb-6">
            <div className="text-center space-y-2">
              <p className="text-sm">
                <span className="text-gray-400">お問い合わせ：</span>
                <a href="mailto:y-sato@sunu25.com" className="text-purple-400 hover:text-purple-300 ml-2">
                  y-sato@sunu25.com
                </a>
              </p>
              <p className="text-sm">
                <span className="text-gray-400">電話：</span>
                <a href="tel:080-9453-0911" className="text-purple-400 hover:text-purple-300 ml-2">
                  080-9453-0911
                </a>
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">運営会社</p>
              <div className="flex justify-center items-center space-x-4 flex-wrap">
                <a href="https://sunu25.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                  株式会社sunu
                </a>
                <span className="text-gray-600">|</span>
                <a href="https://walker.co.jp" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                  株式会社ウォーカー
                </a>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2024 3DLab - 3Dプリンタ 東京 | 湯島・御徒町・秋葉原・御茶ノ水からアクセス
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
