'use client'

import { useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import { Calendar, Clock, MapPin, Users, Check, Star, Gift, BookOpen, Monitor, Zap, Heart } from 'lucide-react'
import Footer from '@/components/Footer'
import {
  CAMPAIGN_END_LABEL,
  REGULAR_REGISTRATION_FEE,
  isEnrollmentFeeCampaignActive,
} from '@/lib/school-campaign'

const campaignActive = isEnrollmentFeeCampaignActive()

export default function SchoolPage() {
  const [selectedClass, setSelectedClass] = useState<'free' | 'basic'>('free')

  const features = [
    { icon: Monitor, text: '有料版AIが使い放題！' },
    { icon: Gift, text: 'ワークショップに30％OFFで参加可能' },
    { icon: Star, text: '作品発表会への参加券！' },
    { icon: BookOpen, text: '未来に必要なスキルが学べるウェビナーへ無料招待' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
              第1期生 大募集
            </div>
            <h1 className="text-5xl sm:text-6xl font-black mb-6">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                3DLab
              </span>
              <br />
              <span className="text-gray-900">AI×3Dプリンタ教室</span>
            </h1>
            <p className="text-2xl text-gray-700 mb-4">未来を創る思考力</p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              PCスキルも身につく！プログラミング教室で一緒に作り上げる
            </p>
            
            {/* 入会特典 */}
            <div className="mt-8 flex flex-col items-center gap-3">
              {campaignActive && (
                <div className="inline-flex flex-col sm:flex-row sm:items-center bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-2xl shadow-lg">
                  <span className="flex items-center justify-center text-xl font-bold">
                    <Zap className="w-6 h-6 mr-2" />
                    入会金<span className="line-through opacity-70 mx-1 font-normal">¥{REGULAR_REGISTRATION_FEE.toLocaleString()}</span>が0円！
                  </span>
                  <span className="mt-1 sm:mt-0 sm:ml-4 text-sm font-semibold bg-white/20 rounded-full px-3 py-1">
                    {CAMPAIGN_END_LABEL}まで
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Hero Image */}
          <div className="relative max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-400 opacity-20"></div>
                <div className="relative h-full flex items-center justify-center bg-white/90">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">3D</span>
                    </div>
                    <p className="text-gray-800 font-medium">3DLabで創造力を育む</p>
                  </div>
                </div>
              </div>
              <div className="relative h-64 rounded-2xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 opacity-20"></div>
                <div className="relative h-full flex items-center justify-center bg-white/90">
                  <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center">
                      <Monitor className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-gray-800 font-medium">最新技術を楽しく学ぶ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Class Selection */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            クラス紹介
          </h2>
          
          <div className="max-w-xl mx-auto">
            {/* 自由創作クラス */}
            <div 
              className={`relative bg-white rounded-3xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                selectedClass === 'free' ? 'ring-4 ring-purple-600 scale-[1.02]' : 'hover:shadow-2xl'
              }`}
              onClick={() => setSelectedClass('free')}
            >
              <div className="absolute top-4 right-4">
                {selectedClass === 'free' && (
                  <div className="bg-purple-600 text-white rounded-full p-2">
                    <Check className="w-5 h-5" />
                  </div>
                )}
              </div>
              
              <div className="p-8">
                <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-full inline-block mb-4">
                  <span className="text-sm font-bold">自由創作クラス（教室開放）</span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  作りたいを自由に、<br />
                  いつでも質問できる安心ラボ
                </h3>
                
                <p className="text-gray-600 mb-6">
                  PCや有料版AIを自由に使いながら、自分のアイデアをとことん形にできるクラス。
                  わからないことも講師にその場で質問できるので、初めてでも安心！
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium">月2回</p>
                      <p className="text-sm text-gray-500">開校日の好きな日に参加可能</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium">120分/回</p>
                      <p className="text-sm text-gray-500">たっぷり制作時間</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Gift className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium">制作し放題</p>
                      <p className="text-sm text-gray-500">時間内で自由に創作</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">月謝</span>
                    <span className="text-3xl font-bold text-gray-900">¥17,000</span>
                  </div>
                  {campaignActive ? (
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                      <span className="text-base font-semibold text-gray-800">入会金</span>
                      <span className="text-right">
                        <span className="text-base text-gray-400 line-through mr-2">
                          ¥{REGULAR_REGISTRATION_FEE.toLocaleString()}
                        </span>
                        <span className="text-2xl font-black text-orange-600">¥0</span>
                      </span>
                    </div>
                  ) : (
                    <p className="text-base text-gray-500">入会金: ¥20,000（税別）※システム登録料含む</p>
                  )}
                </div>
              </div>
            </div>

          </div>
          
          {/* 申込ボタン */}
          <div className="mt-12 text-center">
            <Link 
              href={`/school/apply?class=${selectedClass}`}
              className="inline-flex items-center px-12 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-bold rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            >
              <Heart className="w-6 h-6 mr-3" />
              このクラスに申し込む
            </Link>
          </div>
        </div>
      </section>

      {/* Special Benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-purple-100 to-pink-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            スクール生特典も豊富！！
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-gray-800 font-medium flex-1">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Info */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">教室情報</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-purple-600 mt-1 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">所在地</p>
                  <p className="text-gray-600">文京区湯島3-14-8 5F</p>
                  <p className="text-sm text-gray-500">湯島駅から徒歩3分</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Clock className="w-5 h-5 text-purple-600 mt-1 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">営業時間</p>
                  <p className="text-gray-600">10:00 - 19:00</p>
                  <p className="text-sm text-gray-500">定休日：火曜日</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Users className="w-5 h-5 text-purple-600 mt-1 mr-3" />
                <div>
                  <p className="font-semibold text-gray-900">お問い合わせ</p>
                  <p className="text-gray-600">080-9453-0911</p>
                  <p className="text-gray-500 text-xs">※「3DLabを見た」とお伝えください</p>
                  <p className="text-gray-600">3dlab@sunu25.com</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-6">詳細はお気軽にお問い合わせください</p>
            <Link 
              href={`/school/apply?class=${selectedClass}`}
              className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
            >
              申込フォームへ進む
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}