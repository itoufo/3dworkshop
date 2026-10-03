import type { Metadata } from 'next'
import StoreCartClient from '@/components/store/StoreCartClient'
import { currentStoreUser } from '@/lib/store/session'

export const metadata: Metadata = {
  title: 'Cart',
  robots: { index: false, follow: false },
}

/** カート（英語。stores.3dlab.jp/en/cart）。ここから決済すると、決済画面と購入後のメールも英語になる */
export default async function StoreEnglishCartPage() {
  // ログイン中なら、お名前とメールを最初から入れておく
  const user = await currentStoreUser()
  return (
    <div lang="en" className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <StoreCartClient defaultName={user?.name ?? ''} defaultEmail={user?.email ?? ''} />
    </div>
  )
}
