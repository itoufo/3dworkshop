import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '特定商取引法に基づく表記 | 3DLab',
  description: '3Dプリンタ教室「3DLab」（株式会社sunU）の特定商取引法に基づく表記です。',
}

const items: { label: string; value: React.ReactNode }[] = [
  {
    label: '販売事業者',
    value: '株式会社sunU',
  },
  {
    label: '代表者',
    value: '代表取締役 伊東 優',
  },
  {
    label: '所在地',
    value: (
      <>
        〒135-0021<br />
        東京都江東区白河2-16-2
      </>
    ),
  },
  {
    label: '役務提供場所（教室）',
    value: (
      <>
        3DLab<br />
        〒113-0034<br />
        東京都文京区湯島3-14-8 加田湯島ビル 5F
      </>
    ),
  },
  {
    label: '電話番号',
    value: (
      <>
        080-9453-0911<br />
        <span className="text-sm text-gray-500">
          ※ お問い合わせはメールでも承っております
        </span>
      </>
    ),
  },
  {
    label: 'メールアドレス',
    value: (
      <a href="mailto:y-sato@sunu25.com" className="text-purple-600 hover:text-purple-700">
        y-sato@sunu25.com
      </a>
    ),
  },
  {
    label: '販売URL',
    value: (
      <a href="https://3dlab.jp" className="text-purple-600 hover:text-purple-700">
        https://3dlab.jp
      </a>
    ),
  },
  {
    label: '販売価格',
    value: (
      <>
        各ワークショップ・スクールの申込ページに表示する価格（消費税込み）によります。<br />
        スクールについては入会金および月謝を申込ページに表示しています。
      </>
    ),
  },
  {
    label: '商品代金以外の必要料金',
    value: (
      <>
        ワークショップ料金には材料費・設備使用料が含まれています。<br />
        本サイトの閲覧・お申込みに必要なインターネット接続料金・通信料金はお客様のご負担となります。
      </>
    ),
  },
  {
    label: 'お支払い方法',
    value: 'クレジットカード決済（Stripe）',
  },
  {
    label: 'お支払い時期',
    value: 'ご予約・お申込み時にお支払いいただきます。',
  },
  {
    label: '役務の提供時期',
    value: (
      <>
        ワークショップ：ご予約いただいた開催日当日に提供いたします。<br />
        スクール：入会手続き完了後、各回の開講日に提供いたします。
      </>
    ),
  },
  {
    label: 'キャンセル・返金について',
    value: (
      <>
        開催日の前日までにご連絡いただいた場合は、無料でキャンセルでき、全額を返金いたします（決済手数料も当社が負担します）。<br />
        開催日当日のキャンセル、および無連絡でのご不参加については、返金いたしかねます。<br />
        なお、当社の都合によりワークショップが中止となった場合は、時期にかかわらず全額を返金いたします。<br />
        スクール会員の退会は、退会希望月の前月15日までにお申し出ください。
      </>
    ),
  },
]

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />

      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">特定商取引法に基づく表記</h1>

            <dl className="divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.label} className="py-5 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-6">
                  <dt className="font-semibold text-gray-900">{item.label}</dt>
                  <dd className="md:col-span-2 text-gray-700 leading-relaxed">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-center">
                <Link href="/terms" className="text-purple-600 hover:text-purple-700">
                  利用規約はこちら
                </Link>
                <Link href="/privacy" className="text-purple-600 hover:text-purple-700">
                  プライバシーポリシーはこちら
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
