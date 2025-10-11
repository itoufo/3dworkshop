import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import { Sparkles, Box, Printer, Users, ArrowRight, Rocket, Star } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-200/60 via-transparent to-pink-200/40 pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center border border-purple-200 rounded-full px-4 py-1.5 bg-white/80 backdrop-blur">
                <Star className="w-4 h-4 text-purple-500 mr-2" />
                東京・湯島駅から徒歩1分のクリエイティブスタジオ
              </div>
              <h1 className="mt-6 text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
                3Dプリンティングで<br className="hidden sm:inline" />
                アイデアを現実にする。
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
                3DLabは最新の3Dプリンタと熟練のチームが揃う東京・湯島のスタジオです。
                体験向けワークショップからプロトタイピング、モノづくりの伴走支援まで、
                ブランドの世界観をカタチにするお手伝いをします。
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
              <div className="relative rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-2xl p-8">
                <div className="flex justify-center mb-8">
                  <Image
                    src="/logo.png"
                    alt="3DLab"
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
                        Brand Experience
                      </p>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      湯島のスタジオで、ブランドの世界観を3Dプリントで体感。観る、触れる、つくるを通じて新しい発想が生まれます。
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white">
                        <Printer className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">最先端の設備</h3>
                        <p className="text-sm text-gray-500">
                          工業グレードの3Dプリンタと多彩な素材で高品質な造形を実現。
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-pink-500 flex items-center justify-center text-white">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">伴走するチーム</h3>
                        <p className="text-sm text-gray-500">
                          コンセプト設計から造形まで、専門スタッフが丁寧にサポートします。
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
            3DLabが届けたいブランド体験
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            「3Dプリンタでどこまでできるの？」という疑問に、リアルな体験とプロの発想でお応えします。
            発売前のプロトタイプ、展示会での演出、採用イベントや教育プログラムなど、ブランドの物語づくりを立体的にサポートします。
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          <div className="rounded-3xl bg-white border border-purple-100 shadow-lg p-8 flex flex-col">
            <Box className="w-12 h-12 text-purple-600 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">体験設計</h3>
            <p className="text-gray-600 flex-1">
              ブランドの世界観やサービスの価値を伝えるための3D体験を設計。ストーリーに沿った造形で、印象に残る接点をつくります。
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
            <Printer className="w-12 h-12 text-purple-600 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">造形・プロトタイピング</h3>
            <p className="text-gray-600 flex-1">
              小ロットの制作や試作品づくりもスピーディーに対応。素材・仕上げの提案から品質管理まで一貫してサポートします。
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
            <Rocket className="w-12 h-12 text-purple-600 mb-6" />
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">共創ワークショップ</h3>
            <p className="text-gray-600 flex-1">
              初めてでも安心の学習プログラムから、チームビルディング、企業研修まで。アイデアを形にする共創の時間をご提供します。
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

      {/* Testimonial / Community */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-600 font-semibold text-xs tracking-widest uppercase">
                Community
              </div>
              <h2 className="mt-5 text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
                つくる楽しさを共有するコミュニティ
              </h2>
              <p className="mt-6 text-gray-600 leading-relaxed">
                3DLabは造形技術を学ぶ場所であると同時に、発想を広げ合うクリエイティブコミュニティです。
                多様なバックグラウンドのメンバーが集まり、新しいプロジェクトやコラボレーションが次々と生まれています。
              </p>
              <div className="mt-8 space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-white border border-purple-100">
                  <p className="text-sm text-purple-700 font-semibold">
                    企業研修での導入や、教育機関との共同プログラムにも対応。オリジナルカリキュラムの設計から運営まで伴走します。
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                  <p className="text-sm text-gray-600">
                    SNSでは最新の造形事例やイベント情報を発信中。フォローして最新情報をチェックしてください。
                  </p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 blur-2xl" />
              <div className="relative bg-gray-900 text-white rounded-3xl p-10 shadow-2xl border border-white/10">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                      Voice
                    </p>
                    <p className="text-sm text-white/80">
                      Tech Startup / 研修ご担当者さま
                    </p>
                  </div>
                </div>
                <blockquote className="mt-8 text-lg leading-relaxed text-white/90">
                  「社員の創造性を引き出す機会としてワークショップを実施しました。
                  3DLabのサポートで、コンセプトづくりから立体化まで一連のプロセスを体験でき、
                  チームの新しいアイデアが生まれました。」
                </blockquote>
                <div className="mt-10">
                  <a
                    href="mailto:y-sato@sunu25.com"
                    className="inline-flex items-center text-sm font-semibold text-white border-b border-white/40 pb-1 hover:border-white transition-colors"
                  >
                    プログラム導入を相談する
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
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
