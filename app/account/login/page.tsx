import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CustomerLoginForm from '@/components/account/CustomerLoginForm'
import { currentCustomer } from '@/lib/customer-auth'

export const metadata: Metadata = {
  title: 'ログイン',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string; next?: string }>
}) {
  if (await currentCustomer()) redirect('/account')

  const { verified } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">ログイン</h1>
          <p className="text-base text-gray-600 mb-8 text-center">
            ご購入履歴と、作ったクッキー型のデータをご覧いただけます。
          </p>

          {verified === 'expired' && (
            <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-base text-amber-800">
              確認リンクの有効期限が切れています。ログインすると確認メールを送り直します。
            </p>
          )}
          {verified === 'error' && (
            <p className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-700">
              確認に失敗しました。お手数ですがもう一度お試しください。
            </p>
          )}

          <CustomerLoginForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
