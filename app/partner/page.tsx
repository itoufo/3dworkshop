import Link from 'next/link'
import Header from '@/components/Header'
import {
  Sparkles,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  Globe,
  Printer,
  FileText,
  Video,
  MessageSquare,
  Star
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '3DLab 導入プラン | 教育機関・自治体・企業向けパートナープログラム',
  description: 'AI×3Dプリンター融合の学習体験「3DLab」を御社・御校でも。導入プラン15万円〜。教材・研修込みで、すぐに始められるSTEAM教育プログラム。',
}

export default function PartnerPage() {
  const includedItems = [
    { icon: BookOpen, title: '講師マニュアル', description: '初めての方でも安心の詳細ガイド' },
    { icon: Sparkles, title: 'AIデザイン教材', description: '生成AIを活用したデザイン教材一式' },
    { icon: Printer, title: '3Dプリント手順書', description: '出力から仕上げまでの完全マニュアル' },
    { icon: FileText, title: '販促素材', description: 'チラシ・ポスターなどの販促ツール' },
    { icon: MessageSquare, title: 'アンケート雛形', description: '参加者フィードバック収集ツール' },
    { icon: Video, title: '講師研修', description: 'オンラインでの導入研修サポート' },
  ]

  const targetAudiences = [
    { icon: GraduationCap, title: '教育機関', description: '小中高校、専門学校、大学など' },
    { icon: Building2, title: '自治体', description: '公民館、図書館、地域センターなど' },
    { icon: Users, title: '企業', description: '社内研修、福利厚生、CSR活動など' },
    { icon: Sparkles, title: '商業施設', description: 'ショッピングモール、百貨店など' },
    { icon: Globe, title: '宿泊施設', description: 'ホテル、旅館、リゾート施設など' },
    { icon: BookOpen, title: '個人教室', description: 'プログラミング教室、学習塾など' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
              パートナー募集中
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                3DLab 導入プラン
              </span>
            </h1>
            <p className="text-xl text-gray-700 mb-4">
              AI×3Dプリンター融合の学習体験を、あなたの場所でも
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              教育機関、自治体、企業、商業施設など、様々な場所で「3DLab」プログラムを
              導入いただけます。教材・研修込みで、すぐにSTEAM教育を始められます。
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">100+</div>
              <p className="text-gray-600">参加者数</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-pink-600 mb-2">95%</div>
              <p className="text-gray-600">最高評価の満足度</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">2時間</div>
              <p className="text-gray-600">体験型STEAMプログラム</p>
            </div>
          </div>
        </div>
      </section>

      {/* What is 3DLab */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            3DLabとは
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">生成AIでデザイン</h3>
                    <p className="text-gray-600">
                      最新の生成AIを使って、子どもから大人まで誰でも簡単にオリジナルデザインを作成できます。
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                    <Printer className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">3Dプリンターで実現</h3>
                    <p className="text-gray-600">
                      AIで作ったデザインを3Dプリンターで実際に形にします。デジタルとリアルをつなぐ体験です。
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0 mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">少人数制で安心</h3>
                    <p className="text-gray-600">
                      一人ひとりに寄り添った指導で、初心者でも安心して参加できる環境を提供します。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl p-8">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">3D</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">2時間の体験プログラム</h3>
                <p className="text-gray-600 mb-6">
                  アイデア出し → AIデザイン → 3Dプリント → 完成品お持ち帰り
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="bg-white px-3 py-1 rounded-full text-sm text-purple-600 font-medium">親子</span>
                  <span className="bg-white px-3 py-1 rounded-full text-sm text-purple-600 font-medium">小学生</span>
                  <span className="bg-white px-3 py-1 rounded-full text-sm text-purple-600 font-medium">中高生</span>
                  <span className="bg-white px-3 py-1 rounded-full text-sm text-purple-600 font-medium">大人</span>
                  <span className="bg-white px-3 py-1 rounded-full text-sm text-purple-600 font-medium">シニア</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">導入プラン</h2>
              <p className="text-purple-100">教材・研修込みですぐに始められます</p>
            </div>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center">
                  <span className="text-5xl font-bold text-gray-900">15</span>
                  <span className="text-3xl font-bold text-gray-900">万円</span>
                  <span className="text-gray-500 ml-2">〜</span>
                </div>
                <p className="text-gray-500 mt-2">※規模・内容により変動します</p>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">導入パッケージに含まれるもの</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {includedItems.map((item, index) => (
                    <div key={index} className="flex items-start p-4 bg-purple-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mr-3">
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                <div className="flex items-center mb-2">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  <span className="font-bold text-gray-900">月謝制での継続受講も可能</span>
                </div>
                <p className="text-gray-600 text-sm">
                  導入後、月謝制のスクールとして継続運営することも可能です。詳細はお問い合わせください。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Audiences */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100 to-pink-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            こんな方におすすめ
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            教育機関から企業まで、様々な場面で3DLabプログラムをご活用いただけます
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {targetAudiences.map((audience, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                  <audience.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{audience.title}</h3>
                <p className="text-gray-600 text-sm">{audience.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            参加者の声
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                「子どもと一緒に参加しました。AIでデザインを作るのが楽しく、完成品を持ち帰れるのが嬉しかったです。」
              </p>
              <p className="text-sm text-gray-500">— 親子で参加</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                「経営者として、最新技術に触れる良い機会でした。社員研修にも導入を検討しています。」
              </p>
              <p className="text-sm text-gray-500">— 経営者</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-gray-600 mb-4">
                「教育現場で活用できる内容でした。生徒たちの目が輝いていたのが印象的です。」
              </p>
              <p className="text-sm text-gray-500">— 教育者</p>
            </div>
          </div>
        </div>
      </section>

      {/* Future Plans */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <Globe className="w-16 h-16 mx-auto mb-6 text-purple-400" />
          <h2 className="text-3xl font-bold mb-4">グローバル展開</h2>
          <p className="text-gray-300 text-lg mb-6">
            2026年度にはASEAN圏の日系学校との提携を計画中。
            3DLabの学習体験を世界へ広げていきます。
          </p>
          <div className="inline-flex items-center bg-purple-600/30 px-6 py-3 rounded-full">
            <span className="text-purple-300">パートナー募集中</span>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            導入のご相談
          </h2>
          <p className="text-gray-600 text-center mb-8">
            導入をご検討の方は、お気軽にお問い合わせください。
            オンラインでのご説明も承っております。
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

          {/* Companies */}
          <div className="border-t pt-8">
            <p className="text-center text-gray-500 text-sm mb-4">運営</p>
            <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
              <a href="https://walker.co.jp" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">
                株式会社ウォーカー
              </a>
              <span className="text-gray-300">×</span>
              <a href="https://sunu25.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">
                株式会社sunU
              </a>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/workshops"
              className="inline-flex items-center text-purple-600 font-semibold hover:text-purple-700"
            >
              個人向けワークショップはこちら
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
              AI×3Dプリンター融合の学習体験
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              © 2024 3DLab - 導入プラン
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
