import type { Metadata } from 'next'
import StoreCartClient from '@/components/store/StoreCartClient'
import { currentStoreUser } from '@/lib/store/session'

export const metadata: Metadata = {
  title: 'カート',
  robots: { index: false, follow: false },
}

export default async function StoreCartPage() {
  // ログイン中なら、お名前とメールを最初から入れておく
  const user = await currentStoreUser()
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <StoreCartClient defaultName={user?.name ?? ''} defaultEmail={user?.email ?? ''} />
    </div>
  )
}
