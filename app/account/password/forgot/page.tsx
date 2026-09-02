import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import PasswordForgotForm from '@/components/account/PasswordForgotForm'

export const metadata: Metadata = {
  title: 'パスワードをお忘れの方',
  robots: { index: false, follow: false },
}

export default function ForgotPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">パスワードの再設定</h1>
          <p className="text-base text-gray-600 mb-8 text-center">
            ご登録のメールアドレスに、再設定用のリンクをお送りします。
          </p>
          <PasswordForgotForm />
        </div>
      </main>
      <Footer />
    </div>
  )
}
