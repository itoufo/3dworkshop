import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CustomerRegisterForm from '@/components/account/CustomerRegisterForm'
import { currentCustomer } from '@/lib/customer-auth'

export const metadata: Metadata = {
  title: '会員登録',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function RegisterPage() {
  if (await currentCustomer()) redirect('/account')

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">会員登録</h1>
          <p className="text-base text-gray-600 mb-8 text-center">
            ご購入履歴の確認、作ったクッキー型データの再ダウンロードにお使いいただけます。
            登録しなくてもご購入・ご予約はできます。
          </p>
          <CustomerRegisterForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
