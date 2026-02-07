import Link from 'next/link'
import Header from '@/components/Header'
import { Building2, Users, MapPin, Calendar, Clock, CheckCircle, ArrowRight, Phone, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '出張イベント・企業研修 | 3DLab',
  description: '3DLabの出張イベント・企業研修サービス。3Dプリンター体験を御社のイベントや研修に。出張イベント15万円〜、研修1人10万円〜',
}

export default function BusinessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
              法人・団体様向け
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                出張イベント・企業研修
              </span>
            </h1>
            <p className="text-xl text-gray-700 mb-4">
              3Dプリンター体験を、御社のもとへ
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              展示会・社内イベント・チームビルディング・社員研修など、
              あらゆるシーンで3Dプリンティングの魅力をお届けします。
            </p>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* 出張イベント */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 p-6">
                <div className="flex items-center text-white mb-2">
                  <MapPin className="w-6 h-6 mr-2" />
                  <span className="text-sm font-bold uppercase tracking-wider">Event Service</span>
                </div>
                <h2 className="text-3xl font-bold text-white">出張イベント</h2>
              </div>

              <div className="p-8">
                <p className="text-gray-600 mb-6 leading-relaxed">
                  展示会、採用イベント、ファミリーデー、地域イベントなど、
                  御社のイベントに3Dプリンター体験ブースを出張設営します。
                  来場者が実際に触れて、作って、持ち帰れる体験を提供します。
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                    <span>3Dプリンター・機材一式をお持ちします</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                    <span>スタッフが運営をサポート</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                    <span>イベント内容に合わせたカスタマイズ可能</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-purple-600 mr-3 flex-shrink-0" />
                    <span>企画・提案からお任せください</span>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-2xl p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-gray-600 font-medium">料金</span>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-purple-700">15</span>
                      <span className="text-2xl font-bold text-purple-700">万円</span>
                      <span className="text-gray-500 ml-1">〜</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    ※規模・内容により変動します。お気軽にご相談ください。
                  </p>
                </div>
              </div>
            </div>

            {/* 企業研修 */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-pink-600 to-rose-700 p-6">
                <div className="flex items-center text-white mb-2">
                  <Building2 className="w-6 h-6 mr-2" />
                  <span className="text-sm font-bold uppercase tracking-wider">Training Service</span>
                </div>
                <h2 className="text-3xl font-bold text-white">企業研修</h2>
              </div>

              <div className="p-8">
                <p className="text-gray-600 mb-6 leading-relaxed">
                  3Dプリンター・AI・デジタルファブリケーションの基礎から応用まで、
                  御社の課題やニーズに合わせたカスタム研修プログラムを提供します。
                  新人研修、リスキリング、チームビルディングにも最適です。
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" />
                    <span>御社のニーズに合わせたカリキュラム設計</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" />
                    <span>実際に手を動かして学ぶ実践型研修</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" />
                    <span>AI×3Dプリンターの最新活用法を習得</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-5 h-5 text-pink-600 mr-3 flex-shrink-0" />
                    <span>出張研修・教室での研修どちらも対応</span>
                  </div>
                </div>

                <div className="bg-pink-50 rounded-2xl p-6">
                  <div className="flex items-baseline justify-between">
                    <span className="text-gray-600 font-medium">料金</span>
                    <div className="text-right">
                      <span className="text-4xl font-bold text-pink-700">10</span>
                      <span className="text-2xl font-bold text-pink-700">万円</span>
                      <span className="text-gray-500 ml-1">〜 / 人</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    ※人数・研修内容により変動します。お見積りはお気軽にどうぞ。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100 to-pink-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            こんなシーンでご活用いただけます
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">採用イベント・会社説明会</h3>
              <p className="text-gray-600 text-sm">
                最先端技術の体験で学生の興味を引きつけ、企業の先進性をアピール
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">ファミリーデー・社内イベント</h3>
              <p className="text-gray-600 text-sm">
                子どもから大人まで楽しめる3Dプリンター体験で思い出に残るイベントに
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">展示会・商業施設イベント</h3>
              <p className="text-gray-600 text-sm">
                来場者の注目を集める体験型ブースで集客力アップ
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">新人研修・リスキリング</h3>
              <p className="text-gray-600 text-sm">
                デジタルものづくりの基礎を実践的に学び、DX人材を育成
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">チームビルディング</h3>
              <p className="text-gray-600 text-sm">
                共同制作を通じてチームワークと創造力を高める体験プログラム
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">地域・自治体イベント</h3>
              <p className="text-gray-600 text-sm">
                地域活性化イベントやSTEM教育プログラムの一環として
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            お気軽にご相談ください
          </h2>
          <p className="text-gray-600 text-center mb-8">
            イベントの規模や内容、ご予算に応じて最適なプランをご提案いたします。
            まずはお気軽にお問い合わせください。
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <a
              href="tel:080-9453-0911"
              className="flex items-center justify-center p-6 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-colors"
            >
              <Phone className="w-6 h-6 text-purple-600 mr-3" />
              <div>
                <p className="text-sm text-gray-500">お電話</p>
                <p className="text-lg font-bold text-purple-700">080-9453-0911</p>
              </div>
            </a>

            <a
              href="mailto:y-sato@sunu25.com"
              className="flex items-center justify-center p-6 bg-pink-50 rounded-2xl hover:bg-pink-100 transition-colors"
            >
              <Mail className="w-6 h-6 text-pink-600 mr-3" />
              <div>
                <p className="text-sm text-gray-500">メール</p>
                <p className="text-lg font-bold text-pink-700">y-sato@sunu25.com</p>
              </div>
            </a>
          </div>

          <div className="text-center space-y-3">
            <Link
              href="/workshops"
              className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              個人向けワークショップはこちら
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <br />
            <Link
              href="/products/3d-printing/new"
              className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              3Dプリント制作を依頼する
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
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
            <h3 className="text-xl font-bold text-white mb-2">3DLab</h3>
            <p className="text-sm text-gray-400">
              東京・秋葉原エリア（文京区湯島3-14-8 加田湯島ビル 5F）
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2024 3DLab - 出張イベント・企業研修
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
