'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SchoolPage() {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'standard' | 'premium'>('standard')

  const plans = {
    basic: {
      name: '体験プラン',
      price: '月額 ¥9,800',
      features: [
        '月1回の講習受講（100g以内）',
        '3Dプリンタ利用時間: 30分/回',
        'フィラメント3色まで選択可',
        'オンラインサポート',
        '基礎教材アクセス',
        '作品お持ち帰り可'
      ],
      color: 'from-blue-500 to-cyan-500'
    },
    standard: {
      name: 'スタンダードプラン',
      price: '月額 ¥19,800',
      features: [
        '100g以内なら月2回 / 300g以内なら月1回',
        '3Dプリンタ利用時間: 1時間/回',
        'フィラメント4色まで選択可',
        '24時間オンラインサポート',
        '全教材アクセス',
        '作品保管スペース',
        'フィラメント追加購入10%割引',
        '特別ワークショップ優先予約'
      ],
      recommended: true,
      color: 'from-purple-500 to-pink-500'
    },
    premium: {
      name: 'プレミアムプラン',
      price: '月額 ¥39,800',
      features: [
        '200g以内なら月4回 / 500g以内なら月2回',
        '3Dプリンタ利用時間: 2時間/回',
        'フィラメント4色まで選択可',
        '専任インストラクター',
        '全教材・アドバンスコース',
        '専用作品保管スペース',
        'フィラメント追加購入30%割引',
        '特別ワークショップ50%割引',
        '商用利用ライセンス付与'
      ],
      color: 'from-amber-500 to-orange-500'
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert(`${plans[selectedPlan].name}への申し込みを受け付けました。詳細はメールでご連絡いたします。`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* ヒーローセクション */}
      <section className="pt-24 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
              3Dプリンタースクール
            </span>
          </h1>
          <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
            初心者から上級者まで、あなたのレベルに合わせた3Dプリンティング技術を習得。
            創造力を形にする力を身につけましょう。
          </p>
          <div className="flex gap-4 justify-center">
            <a href="#pricing" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105">
              料金プランを見る
            </a>
            <Link href="/admin" className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold border-2 border-purple-600 hover:bg-purple-50 transition-all duration-300">
              会員ログイン
            </Link>
          </div>
        </div>
      </section>

      {/* 特徴セクション */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">スクールの特徴</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">体系的なカリキュラム</h3>
              <p className="text-gray-600">基礎から応用まで、段階的に学べる充実したカリキュラムをご用意</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">少人数制レッスン</h3>
              <p className="text-gray-600">一人ひとりに寄り添った丁寧な指導で、確実にスキルアップ</p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-shadow">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-4">実践的なプロジェクト</h3>
              <p className="text-gray-600">実際の制作を通じて、即戦力となる技術を身につけます</p>
            </div>
          </div>
        </div>
      </section>

      {/* 料金プランセクション */}
      <section id="pricing" className="py-16 px-4 bg-white/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">料金プラン</h2>
          <p className="text-center text-gray-600 mb-12">あなたのニーズに合わせた最適なプランをお選びください</p>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {Object.entries(plans).map(([key, plan]) => (
              <div
                key={key}
                className={`relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer ${
                  selectedPlan === key ? 'ring-4 ring-purple-500 scale-105' : ''
                } ${'recommended' in plan && plan.recommended ? 'md:scale-105' : ''}`}
                onClick={() => setSelectedPlan(key as 'basic' | 'standard' | 'premium')}
              >
                {'recommended' in plan && plan.recommended && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      おすすめ
                    </span>
                  </div>
                )}
                <div className={`w-full h-2 bg-gradient-to-r ${plan.color} rounded-full mb-6`}></div>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {plan.price}
                </p>
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* 申し込みフォーム */}
          <div className="max-w-2xl mx-auto bg-white rounded-2xl p-8 shadow-xl">
            <h3 className="text-2xl font-bold mb-6 text-center">サブスクリプション申し込み</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">選択プラン</label>
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <p className="font-semibold text-lg">{plans[selectedPlan].name}</p>
                  <p className="text-purple-600 font-bold">{plans[selectedPlan].price}</p>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    お名前 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  電話番号 *
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  ご要望・ご質問（任意）
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  className="mt-1 mr-2"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  <Link href="/terms" className="text-purple-600 hover:underline">利用規約</Link>と
                  <Link href="/privacy" className="text-purple-600 hover:underline">プライバシーポリシー</Link>
                  に同意します
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-semibold hover:shadow-2xl transition-all duration-300 hover:scale-105"
              >
                申し込みを完了する
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* CTA セクション */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">今すぐ始めましょう</h2>
          <p className="text-lg text-gray-700 mb-8">
            無料体験レッスンも実施中。まずはお気軽にお問い合わせください。
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/contact"
              className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold border-2 border-purple-600 hover:bg-purple-50 transition-all duration-300"
            >
              お問い合わせ
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-gray-200 text-gray-700 rounded-full font-semibold hover:bg-gray-300 transition-all duration-300"
            >
              ワークショップ一覧へ
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}