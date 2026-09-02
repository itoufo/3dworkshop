import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'お支払いが完了しました',
  robots: { index: false, follow: false },
}

export default function ProductionRequestSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">お支払いが完了しました</h1>
          <p className="text-gray-700 mb-2">
            制作依頼のお支払いを承りました。ありがとうございます。
          </p>
          <p className="text-gray-700 mb-8">
            ご入力いただいたメールアドレスに確認メールをお送りしています。担当者から制作の進行についてあらためてご連絡いたします。
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-full hover:shadow-lg transition-all duration-300"
          >
            トップページへ
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
