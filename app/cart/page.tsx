import type { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartClient from '@/components/CartClient'

export const metadata: Metadata = {
  title: 'ショッピングカート',
  robots: { index: false, follow: false },
}

export default function CartPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <CartClient />
        </div>
      </main>
      <Footer />
    </div>
  )
}
