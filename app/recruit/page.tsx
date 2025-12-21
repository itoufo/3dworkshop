'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Clock, CircleDollarSign, Heart, Sparkles, CheckCircle } from 'lucide-react'

export default function RecruitPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="relative rounded-3xl overflow-hidden mb-12">
            <div className="absolute inset-0">
              <Image
                src="/hero-bg.jpg"
                alt="3DLabワークショップの様子"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-pink-900/60" />
            </div>
            <div className="relative text-center py-16 px-6">
              <div className="inline-block bg-pink-500 text-white font-bold px-4 py-2 rounded-full text-sm mb-4">
                未経験OK！講師デビュー
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                ワークショップ講師募集
              </h1>
              <p className="text-xl text-purple-100">
                学生さん・主婦の方、大歓迎！
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            {/* Appeal Points */}
            <section className="mb-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">🎓</div>
                  <p className="font-bold text-gray-900">未経験OK</p>
                  <p className="text-sm text-gray-600">丁寧に教えます！</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">📅</div>
                  <p className="font-bold text-gray-900">週2日〜OK</p>
                  <p className="text-sm text-gray-600">シフト相談できます</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">🚃</div>
                  <p className="font-bold text-gray-900">駅チカ</p>
                  <p className="text-sm text-gray-600">湯島駅から徒歩1分</p>
                </div>
                <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">🤖</div>
                  <p className="font-bold text-gray-900">AIが学べる</p>
                  <p className="text-sm text-gray-600">最新技術に触れられる！</p>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">こんな職場です</h2>
              </div>

              {/* Workplace Image */}
              <div className="relative h-48 rounded-2xl overflow-hidden mb-6">
                <Image
                  src="/hero-bg.jpg"
                  alt="3DLabスタジオの様子"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-bold">湯島駅すぐのスタジオ</p>
                  <p className="text-sm opacity-90">明るく開放的な空間です</p>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed">
                3DLabは湯島駅すぐの3Dプリンター体験スタジオ。
                お子さん連れのご家族やものづくりが好きな方が参加されるワークショップで、講師として活躍していただきます。
                「教えた経験がない...」という方も大丈夫！まずは先輩講師のサポートからスタート。
                3DプリンターやAIに興味がなくても、<strong className="text-purple-600">働きながら自然と最新技術に詳しくなれます</strong>。
                就活や将来のキャリアに役立つ経験ができますよ！
              </p>
            </section>

            {/* Job Details */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">募集内容</h2>

              <div className="space-y-6">
                {/* Job Description */}
                <div className="bg-yellow-50 rounded-2xl p-6 border-2 border-yellow-200">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Heart className="w-5 h-5 text-pink-500 mr-2" />
                    募集職種：ワークショップ講師
                  </h3>
                  <p className="text-gray-700 mb-4">
                    3Dプリンターやプログラミングのワークショップで、子どもたちや参加者に教えるお仕事です。
                  </p>

                  <div className="bg-white rounded-xl p-4 mb-4">
                    <p className="font-bold text-purple-600 mb-2">まずはサポートからスタート！</p>
                    <div className="flex items-center text-gray-600 text-sm">
                      <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full">STEP1</span>
                      <span className="mx-2">→</span>
                      <span>講師のサポート・準備</span>
                      <span className="mx-2">→</span>
                      <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full">STEP2</span>
                      <span className="mx-2">→</span>
                      <span>講師デビュー！</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>ワークショップの進行・参加者へのレクチャー</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>3Dプリンター・プログラミングの操作サポート</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>教材・機材の準備・片付け</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>参加者の作品づくりのお手伝い</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-500 bg-white rounded-lg p-3">
                    ※経験ゼロでも大丈夫！先輩スタッフが丁寧に教えます。まずはサポートから始めて、慣れてきたら講師としてデビュー！
                  </p>
                </div>

                {/* Location */}
                <div className="flex items-start p-4 border border-gray-200 rounded-xl">
                  <MapPin className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">勤務地</h3>
                    <p className="text-gray-700">東京都文京区湯島3-14-8 加田湯島ビル 5F</p>
                    <p className="text-sm text-gray-500 mt-1">
                      湯島駅 徒歩1分 / 御徒町駅 徒歩8分 / 秋葉原駅 徒歩10分
                    </p>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start p-4 border border-gray-200 rounded-xl">
                  <Clock className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">勤務時間</h3>
                    <p className="text-gray-700">10:00〜20:00の間で応相談</p>
                    <ul className="text-sm text-gray-500 mt-2 space-y-1">
                      <li>・週2日〜、1日4時間〜OK</li>
                      <li>・土日に入れる方、大歓迎！</li>
                      <li>・学校帰り、お子さんのお迎え前など柔軟に対応します</li>
                    </ul>
                  </div>
                </div>

                {/* Salary */}
                <div className="flex items-start p-4 border border-gray-200 rounded-xl bg-purple-50">
                  <CircleDollarSign className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">時給</h3>
                    <p className="text-2xl font-bold text-purple-600">1,250円〜</p>
                    <p className="text-sm text-gray-500 mt-1">交通費支給（上限あり）/ 昇給あり</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Who We're Looking For */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">こんな方にピッタリ</h2>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6">
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">👩‍🎓</span>
                    <span>授業やサークルと両立したい<strong className="text-purple-600">学生さん</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">👩</span>
                    <span>お子さんが学校に行っている間に働きたい<strong className="text-purple-600">主婦の方</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">😊</span>
                    <span>人と話すのが好き、接客に興味がある方</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">🎨</span>
                    <span>ものづくりや手作りが好きな方</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-2xl mr-3">👶</span>
                    <span>子どもと接するのが好きな方</span>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-purple-200 bg-white rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong className="text-purple-600">経験・資格は一切不要！</strong>
                    「3Dプリンターって何？」という方でもOK。丁寧に教えます。
                    明るく元気に対応していただければ大丈夫です。
                  </p>
                </div>
              </div>
            </section>

            {/* Benefits */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">うれしいポイント</h2>

              {/* AI Experience Highlight */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
                <div className="flex items-start">
                  <div className="text-4xl mr-4">🤖</div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg mb-2">AIと3Dプリンターが学べる！</h3>
                    <p className="text-gray-700">
                      今話題のAI（人工知能）や3Dプリンターを実際に使いながら学べます。
                      「AIって難しそう...」と思っている方も大丈夫！
                      日々の業務を通じて自然と身につくので、<strong className="text-blue-600">就活でアピールできるスキル</strong>が手に入ります。
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-2">🎁</div>
                  <p className="font-medium text-gray-900">交通費支給</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-2">📚</div>
                  <p className="font-medium text-gray-900">研修あり</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-2">👗</div>
                  <p className="font-medium text-gray-900">服装自由</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <div className="text-2xl mb-2">🎉</div>
                  <p className="font-medium text-gray-900">スタッフ割引</p>
                </div>
              </div>
            </section>

            {/* How to Apply */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">応募方法</h2>
              <div className="bg-purple-600 text-white rounded-2xl p-6">
                <p className="mb-4 text-lg">
                  まずはお気軽にご連絡ください！
                </p>
                <p className="mb-4 text-purple-200">
                  メールでお名前・電話番号・希望の勤務日をお送りいただくか、お電話でもOKです。
                  「ちょっと話を聞いてみたい」だけでも大歓迎！
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="mailto:y-sato@sunu25.com?subject=アルバイト応募"
                    className="inline-block bg-white text-purple-600 font-bold px-6 py-3 rounded-full hover:bg-purple-50 transition-colors text-center"
                  >
                    メールで応募
                  </a>
                  <a
                    href="tel:080-9453-0911"
                    className="inline-block bg-pink-500 text-white font-bold px-6 py-3 rounded-full hover:bg-pink-600 transition-colors text-center"
                  >
                    電話で応募 080-9453-0911
                  </a>
                </div>
                <p className="mt-4 text-purple-200 text-sm">
                  ※電話受付：10:00〜18:00
                </p>
              </div>
            </section>

            <div className="mt-12 pt-8 border-t border-gray-200 text-center">
              <Link
                href="/"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
              >
                トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
