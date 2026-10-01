import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { currentStoreUser } from '@/lib/store/session'
import { safeNextPath } from '@/lib/store/safe-next'
import { miraiidConfigured, MIRAIID_SIGNUP_URL } from '@/lib/store/miraiid-config'
import StoreLoginForm from './StoreLoginForm'

export const metadata: Metadata = {
  title: 'ログイン',
  robots: { index: false, follow: false },
}

export default async function StoreLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const next = safeNextPath((await searchParams).next)
  if (await currentStoreUser()) redirect(next)

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">ログイン</h1>
      <p className="mt-4 text-base text-gray-700">
        ストアは MiraiID でログインします。Google アカウントか、MiraiID に登録したメールアドレスでログインしてください。
      </p>

      {miraiidConfigured() ? (
        <StoreLoginForm next={next} />
      ) : (
        <p className="mt-8 text-base text-red-600">いまログインできません。時間をおいてお試しください。</p>
      )}

      <p className="mt-8 text-base text-gray-700">
        MiraiID をお持ちでない方は{' '}
        <a href={MIRAIID_SIGNUP_URL} className="text-purple-700 underline" target="_blank" rel="noopener noreferrer">
          MiraiID に登録
        </a>
        してからログインしてください。
      </p>
    </div>
  )
}
