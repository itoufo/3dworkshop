import type { Metadata } from 'next'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ProductionRequestPaymentForm from '@/components/ProductionRequestPaymentForm'

// 個別にご案内したお客様にリンクを渡して使う支払いページなので、検索結果には出さない。
// サイトマップにも追加しない（scripts/generate-sitemap.ts）。
export const metadata: Metadata = {
  title: '制作依頼のお支払い',
  description: '3Dプリント制作依頼のお支払いページです。ご案内した金額を入力してお支払いいただけます。',
  robots: { index: false, follow: false },
}

export default function ProductionRequestPaymentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">制作依頼のお支払い</h1>
            <p className="text-gray-700">
              3Dプリント制作のご依頼について、お打ち合わせでご案内した金額をご入力のうえお支払いください。
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">
            <ProductionRequestPaymentForm />
          </div>

          <div className="bg-white/70 rounded-2xl p-6 mt-6 text-base text-gray-700 space-y-2">
            <p>・決済完了後、ご入力のメールアドレスに確認メールをお送りします。</p>
            <p>・金額にご不明な点がある場合は、お支払い前にご連絡ください。</p>
            <p>・制作着手後のキャンセル・返金はお受けできない場合があります。</p>
            <p className="pt-2">
              <Link href="/tokushoho" className="text-purple-700 underline">特定商取引法に基づく表記</Link>
              <span className="mx-2 text-gray-400">/</span>
              <Link href="/terms" className="text-purple-700 underline">利用規約</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
