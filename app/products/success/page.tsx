import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'

export const metadata: Metadata = {
  title: 'ご注文ありがとうございます',
  robots: { index: false, follow: false },
}

export default function ProductOrderSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ご注文ありがとうございます</h1>
          <p className="text-gray-700 mb-2">お支払いが完了しました。</p>
          <p className="text-gray-700 mb-8">
            {SHIPPING_LEAD_TIME_TEXT}します。ご入力いただいたメールアドレスに確認メールをお送りしていますので、内容をご確認ください。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/products"
              className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all duration-300"
            >
              ほかの商品を見る
            </Link>
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-white text-gray-700 font-medium rounded-full border-2 border-gray-200 hover:border-purple-500 transition-all duration-300"
            >
              トップページへ
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
