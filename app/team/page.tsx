import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { StructuredData } from '@/components/StructuredData'
import { Award, BookOpen, Briefcase, ExternalLink, GraduationCap, Instagram, Mail, Pen, Shield, Users, Wrench, Building2, Heart } from 'lucide-react'

export const metadata: Metadata = {
  title: '講師・スタッフ紹介 | 3DLab 東京・湯島の3Dプリンター教室',
  description: '3DLab（東京・湯島）の講師・制作スタッフ紹介。AI×3Dプリンターの専門家チームが、ワークショップ・スクール・1点からの制作依頼まで対応。初心者から法人まで、あなたのものづくりを全力サポートします。',
  keywords: '3DLab,講師紹介,スタッフ,3Dプリンター,東京,湯島,AI教育,ワークショップ,制作依頼,3Dプリント,オーダーメイド',
  alternates: {
    canonical: '/team',
  },
  openGraph: {
    title: '講師・スタッフ紹介 | 3DLab 東京・湯島の3Dプリンター教室',
    description: 'AI×3Dプリンターの専門家チームが、ワークショップ・スクール・1点からの制作依頼まで対応。初心者から法人まで全力サポート。',
    url: 'https://3dlab.jp/team',
    type: 'website',
  },
}

function teamStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "講師・スタッフ紹介 | 3DLab",
    "description": "3DLab（東京・湯島）の講師・制作スタッフ紹介。AI×3Dプリンターの専門家チーム。",
    "url": "https://3dlab.jp/team",
    "mainEntity": {
      "@type": "Organization",
      "name": "3DLab - 3Dプリンタ教室",
      "url": "https://3dlab.jp",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "文京区",
        "addressRegion": "東京都",
        "postalCode": "113-0034",
        "addressCountry": "JP",
        "streetAddress": "湯島3-14-8 加田湯島ビル 5F"
      },
      "member": [
        {
          "@type": "Person",
          "name": "伊東雄歩",
          "jobTitle": "技術監修 / AI講師",
          "description": "MENSA会員・JDLA認定講座講師。株式会社ウォーカー代表取締役。AI開発・セキュリティ・教育事業を展開するフルスタックエンジニア。",
          "sameAs": [
            "https://x.com/itoWalker",
            "https://www.instagram.com/itoyuho.0703/",
            "https://note.com/yuho_walker",
            "https://walker.co.jp/"
          ]
        },
        {
          "@type": "Person",
          "name": "伊東優",
          "jobTitle": "運営統括 / ワークショップ講師",
          "image": "https://3dlab.jp/staff-ito-yu.jpg",
          "description": "株式会社sunU代表取締役。東洋大学国際観光学科卒。宿泊業DX・AI活用から教育事業まで幅広く手掛ける。",
          "sameAs": [
            "https://x.com/ryokansunu",
            "https://www.instagram.com/yuryokanai/",
            "https://www.facebook.com/share/1813ZTYwPv/",
            "https://sunu25.com/"
          ]
        }
      ]
    }
  }
}

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <StructuredData data={teamStructuredData()} />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-6">
              TEAM
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                講師・スタッフ紹介
              </span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
              3DLabを支えるプロフェッショナルチーム。<br className="hidden sm:inline" />
              テクノロジーと教育への情熱で、あなたの「作りたい」を全力でサポートします。
            </p>
            {/* 3DLab SNS */}
            <div className="flex justify-center gap-4">
              <a
                href="https://www.instagram.com/ai_3dprinter/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <Instagram className="w-4 h-4" />
                @ai_3dprinter
              </a>
            </div>
          </div>

          {/* ===== 伊東雄歩 ===== */}
          <section className="mb-16">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/30">
                    <Image
                      src="/staff-ito-yuho-headshot.webp"
                      alt="伊東 雄歩"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-white">
                    <p className="text-sm font-medium text-purple-200 mb-1">技術監修 / AI講師</p>
                    <h2 className="text-3xl font-bold">伊東 雄歩</h2>
                    <p className="text-purple-200 text-sm mt-1">Yuho Ito</p>
                  </div>
                  <div className="sm:ml-auto flex flex-wrap gap-2">
                    <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                      株式会社ウォーカー 代表取締役
                    </span>
                    <span className="bg-yellow-400/90 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                      MENSA会員
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-10">
                {/* Photo + Bio Grid */}
                <div className="flex flex-col md:flex-row gap-8 mb-8">
                  {/* Photo */}
                  <div className="md:w-64 flex-shrink-0">
                    <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[3/4]">
                      <Image
                        src="/staff-ito-yuho-workshop.jpg"
                        alt="伊東 雄歩 - 3Dプリンターワークショップで指導中"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 256px"
                      />
                    </div>
                  </div>
                  {/* Bio */}
                  <div className="flex-1">
                    <p className="text-xl font-bold text-gray-900 mb-1">AIプロフェッショナル</p>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      IQ130超・MENSA会員。2015年に株式会社ウォーカーを創業し、AI開発・セキュリティ・教育事業を展開。
                      10年以上の起業経験と、セキュリティからAI製品開発まで全領域をカバーするフルスタックエンジニア。
                      何億円規模のシステム構築実績を持つ。
                    </p>

                  </div>
                </div>

                {/* Credentials */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">50+</p>
                    <p className="text-sm text-gray-600">システム構築</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">200+</p>
                    <p className="text-sm text-gray-600">セミナー・WS</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">3,000+</p>
                    <p className="text-sm text-gray-600">受講者数</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">90%</p>
                    <p className="text-sm text-gray-600">3ヶ月内AI成果物</p>
                  </div>
                </div>

                {/* Credentials */}
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <Award className="w-5 h-5 text-purple-600 mr-2" />
                    資格・役職
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                      MENSA会員（IQ130超）
                    </span>
                    <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                      JDLA認定講座講師
                    </span>
                    <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">
                      健全AI教育協会（HAIIA）理事
                    </span>
                  </div>
                </div>

                {/* Expertise Areas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="border border-purple-100 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">AI・システム開発</h4>
                    <p className="text-sm text-gray-600">
                      TensorFlow, LLM API, React, Next.js, Laravel, Django等。
                      衛星画像解析から暗号通貨取引まで幅広い開発実績。
                    </p>
                  </div>
                  <div className="border border-purple-100 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">セキュリティ</h4>
                    <p className="text-sm text-gray-600">
                      WAF, SIEM, SOC構築、脆弱性診断、ペネトレーションテスト。
                      全国規模セキュリティサービスの技術主任経験。
                    </p>
                  </div>
                  <div className="border border-purple-100 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-3">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">AI教育</h4>
                    <p className="text-sm text-gray-600">
                      「新人類育成計画」主宰。2日でAIエンジニアを育成する超集中プログラム。
                      受講者の90%が3ヶ月以内に成果物を作成。
                    </p>
                  </div>
                </div>

                {/* Philosophy */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8">
                  <p className="text-gray-700 font-medium italic leading-relaxed">
                    「AIと共に、自分で考える力を取り戻す人を増やす」
                    ── 技術に振り回されるのではなく、技術を使って自分のアイデアを実現できる人を育てたい。
                    試行錯誤こそが価値であり、AIは相棒、自分が主導。
                  </p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://walker.co.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    株式会社ウォーカー
                  </a>
                  <a
                    href="https://www.walker.co.jp/works/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <Briefcase className="w-4 h-4" />
                    ポートフォリオ
                  </a>
                  <a
                    href="https://x.com/itoWalker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    @itoWalker
                  </a>
                  <a
                    href="https://www.instagram.com/itoyuho.0703/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-all"
                  >
                    <Instagram className="w-4 h-4" />
                    @itoyuho.0703
                  </a>
                  <a
                    href="https://note.com/yuho_walker"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <Pen className="w-4 h-4" />
                    note
                  </a>
                  <a
                    href="https://www.taolis.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    タオリス
                  </a>
                  <a
                    href="https://miraipost.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    MiraiPost
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* ===== 伊東優 ===== */}
          <section className="mb-16">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              {/* Profile Header with Photo */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white/30">
                    <Image
                      src="/staff-ito-yu-headshot.jpg"
                      alt="伊東 優"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-white">
                    <p className="text-sm font-medium text-blue-200 mb-1">運営統括 / ワークショップ講師</p>
                    <h2 className="text-3xl font-bold">伊東 優</h2>
                    <p className="text-blue-200 text-sm mt-1">Yu Ito</p>
                  </div>
                  <div className="sm:ml-auto">
                    <span className="bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full">
                      株式会社sunU 代表取締役
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-10">
                {/* Photo + Bio Grid */}
                <div className="flex flex-col md:flex-row gap-8 mb-8">
                  {/* Photo */}
                  <div className="md:w-64 flex-shrink-0">
                    <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[4/3]">
                      <Image
                        src="/staff-ito-yu-workshop.jpg"
                        alt="伊東 優 - 3Dプリンターワークショップで指導中"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 256px"
                      />
                    </div>
                  </div>
                  {/* Bio */}
                  <div className="flex-1">
                    <p className="text-xl font-bold text-gray-900 mb-2">宿泊業×教育×テクノロジー</p>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      東洋大学 国際観光学科卒。外資系リゾートホテル（1,000室規模）や老舗高級旅館など、
                      多様な宿泊施設で現場経験を積み、2023年に株式会社sunUを設立。
                      「提案だけで終わらない、現場に入る支援」をモットーに、
                      宿泊業のDX・AI活用から教育事業まで幅広く手掛ける。
                    </p>

                    {/* Story Highlights */}
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                      <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
                      経歴ハイライト
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <p className="text-gray-700 text-sm">
                          外資系大型リゾートホテルでフロント・レストラン・ベル・レクリエーション等を経験
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <p className="text-gray-700 text-sm">
                          老舗高級旅館でフロント・予約・人材育成・メディア対応・集客まで一通り経験
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <p className="text-gray-700 text-sm">
                          グランピング専門コンサル会社の創業メンバーとして、日本製ドームテント開発・開業支援を担当
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <p className="text-gray-700 text-sm">
                          タイ古式マッサージ施術者（延べ400名以上）。リラクゼーション×経営改善モデルを確立
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                        <p className="text-gray-700 text-sm">
                          学生×宿泊業DXイベント「DigiTech Quest」の課題提供企業として参画
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expertise Areas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="border border-blue-100 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-3">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">実働型コンサル</h4>
                    <p className="text-sm text-gray-600">
                      現場に入りスタッフと同じ目線で働く。
                      オペレーション設計・マニュアル作成・人材育成を一貫サポート。
                    </p>
                  </div>
                  <div className="border border-blue-100 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-3">
                      <Heart className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">ホスピタリティ</h4>
                    <p className="text-sm text-gray-600">
                      外資系ホテルから老舗旅館まで多彩な現場経験。
                      顧客満足度向上と従業員定着率改善を両立。
                    </p>
                  </div>
                  <div className="border border-blue-100 rounded-2xl p-5">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-3">
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-2">DX・AI活用</h4>
                    <p className="text-sm text-gray-600">
                      宿泊業向けAI導入支援。お客様対応AI、業務自動化、
                      需要予測、SNS自動運用など現場目線で実装。
                    </p>
                  </div>
                </div>

                {/* Philosophy */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 mb-8">
                  <p className="text-gray-700 font-medium italic leading-relaxed">
                    「魅力あふれる旅館を残し、働く人を助けたい」
                    ── 現場と経営の両方を知るからこそ、
                    今いる人で無理なく回る仕組みをつくることにこだわっています。
                  </p>
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-3">
                  <a
                    href="https://x.com/ryokansunu"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    @ryokansunu
                  </a>
                  <a
                    href="https://www.instagram.com/yuryokanai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-medium hover:shadow-lg transition-all"
                  >
                    <Instagram className="w-4 h-4" />
                    @yuryokanai
                  </a>
                  <a
                    href="https://www.facebook.com/share/1813ZTYwPv/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    Facebook
                  </a>
                  <a
                    href="https://sunu25.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    株式会社sunU
                  </a>
                  <a
                    href="mailto:y-sato@sunu25.com"
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    メール
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                私たちと一緒に、ものづくりを楽しみませんか？
              </h2>
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                ワークショップやスクールで、3DプリンターとAIの世界を体験してみましょう。
                初めての方でも安心してご参加いただけます。
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/workshops"
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
                >
                  ワークショップを見る
                </Link>
                <Link
                  href="/school"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-all duration-300"
                >
                  スクール詳細
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
