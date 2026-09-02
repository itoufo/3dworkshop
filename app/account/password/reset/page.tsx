import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PasswordResetForm from '@/components/account/PasswordResetForm'

export const metadata: Metadata = {
  title: 'パスワードの再設定',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">新しいパスワード</h1>
          {token ? (
            <PasswordResetForm token={token} />
          ) : (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-base text-red-700">
              リンクが正しくありません。お手数ですが、パスワード再設定をもう一度お申し込みください。
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
