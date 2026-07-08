import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { MapPin, Clock, CircleDollarSign, Users, Calendar, Train, CheckCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'アルバイト募集（ワークショップ講師） | 3DLab 東京・湯島',
  description:
    '湯島駅徒歩1分の3Dプリンター体験スタジオ3DLabで、ワークショップ講師のアルバイトを募集しています。未経験可・週2日/1日4時間から・時給1,250円〜。',
}

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
              <div className="inline-block bg-white/15 border border-white/40 text-white px-4 py-2 rounded-full text-sm mb-4">
                アルバイト・パート募集
              </div>
              <h1 className="text-4xl font-bold text-white mb-4">
                ワークショップ講師募集
              </h1>
              <p className="text-xl text-purple-100">
                未経験の方も、アシスタントから始められます
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            {/* Key Facts */}
            <section className="mb-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="border border-gray-200 rounded-2xl p-5 text-center">
                  <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900">未経験可</p>
                  <p className="text-sm text-gray-500 mt-1">研修があります</p>
                </div>
                <div className="border border-gray-200 rounded-2xl p-5 text-center">
                  <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900">週2日から</p>
                  <p className="text-sm text-gray-500 mt-1">1日4時間〜</p>
                </div>
                <div className="border border-gray-200 rounded-2xl p-5 text-center">
                  <Train className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900">湯島駅 徒歩1分</p>
                  <p className="text-sm text-gray-500 mt-1">御徒町からも8分</p>
                </div>
                <div className="border border-gray-200 rounded-2xl p-5 text-center">
                  <CircleDollarSign className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="font-bold text-gray-900">時給1,250円〜</p>
                  <p className="text-sm text-gray-500 mt-1">交通費支給</p>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">どんな職場か</h2>

              {/* Workplace Image */}
              <div className="relative h-56 rounded-2xl overflow-hidden mb-6">
                <Image
                  src="/staff-workshop-scene.jpg"
                  alt="3DLabワークショップ中のスタッフと参加者"
                  fill
                  className="object-cover"
                  sizes="(max-width: 896px) 100vw, 800px"
                />
              </div>

              <div className="text-gray-700 leading-relaxed space-y-4">
                <p>
                  3DLabは、湯島駅を出てすぐのビルにある3Dプリンター体験スタジオです。
                  週末を中心に、親子連れや、ものづくりに興味のある大人の方が参加するワークショップを開いています。
                  スタッフは数名の小さなチームで、代表も現場で一緒に講師をしています。
                </p>
                <p>
                  お願いしたいのは、このワークショップの運営です。
                  参加者と一緒に手を動かして、AIでデザインを作ったり、3Dプリンターで出力したりする作業をサポートしてもらいます。
                  最初はアシスタントとして先輩講師と一緒に入り、流れがつかめてきたら進行をお任せします。
                  ここまでで数ヶ月かける人もいれば、もっと早い人もいます。
                </p>
                <p>
                  3DプリンターやAIの知識は、入ってから覚えれば十分です。
                  実際、道具の操作は数回やれば慣れるものがほとんどで、それよりも参加者（特に子ども）のペースに合わせて声をかけられることのほうが大事だと考えています。
                </p>
              </div>
            </section>

            {/* Job Details */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">募集要項</h2>

              <div className="space-y-6">
                {/* Job Description */}
                <div className="p-6 border border-gray-200 rounded-2xl">
                  <h3 className="font-bold text-gray-900 mb-3">仕事内容</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>ワークショップの進行、参加者へのレクチャー</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>3Dプリンター・AIツールの操作サポート</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>教材・機材の準備と片付け</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>参加者の作品づくりの手伝い</span>
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-500">
                    入って最初の期間はアシスタント業務（準備・サポート）が中心です。講師デビューの時期は本人と相談しながら決めます。
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
                    <p className="text-gray-700">10:00〜20:00の間で応相談（週2日・1日4時間から）</p>
                    <p className="text-sm text-gray-500 mt-2">
                      ワークショップは土日開催が多いため、土日に入れる方を特に探しています。
                      平日は授業前後・お子さんの送り迎えの時間に合わせるなど、シフトは柔軟に調整できます。
                    </p>
                  </div>
                </div>

                {/* Salary */}
                <div className="flex items-start p-4 border border-gray-200 rounded-xl">
                  <CircleDollarSign className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">給与</h3>
                    <p className="text-2xl font-bold text-gray-900">時給 1,250円〜</p>
                    <p className="text-sm text-gray-500 mt-1">交通費支給（上限あり）・昇給あり</p>
                  </div>
                </div>

                {/* Benefits */}
                <div className="flex items-start p-4 border border-gray-200 rounded-xl">
                  <Users className="w-5 h-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">待遇</h3>
                    <p className="text-gray-700">研修あり / 服装自由 / スタッフ割引（ワークショップ・スクール）</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Who We're Looking For */}
            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">こんな方に向いています</h2>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>子どもと接するのが好きな方（参加者の多くは小学生の親子です）</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>人と話すこと、接客が苦にならない方</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>ものづくりや新しい道具に興味がある方</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>授業や家庭と両立できる仕事を探している学生・主婦（夫）の方</span>
                </li>
              </ul>
              <p className="mt-4 text-sm text-gray-500">
                経験や資格は問いません。3Dプリンターに触ったことがなくても、業務の中で覚えられます。
              </p>
            </section>

            {/* How to Apply */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">応募方法</h2>
              <div className="bg-purple-600 text-white rounded-2xl p-6">
                <p className="mb-4 text-purple-100">
                  メールにお名前・電話番号・希望の勤務日を書いてお送りください。お電話でも受け付けています。
                  応募の前に、スタジオの見学だけしていただくことも可能です。
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
                    className="inline-block border-2 border-white text-white font-bold px-6 py-3 rounded-full hover:bg-white/10 transition-colors text-center"
                  >
                    電話で応募 080-9453-0911
                  </a>
                </div>
                <p className="mt-4 text-purple-200 text-sm">
                  電話受付：10:00〜18:00 /「採用ページを見た」とお伝えください
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
