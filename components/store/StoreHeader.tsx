import Link from 'next/link'
import { currentStoreUser } from '@/lib/store/session'
import { MAIN_SITE_URL } from '@/lib/store/urls'
import StoreLogoutButton from './StoreLogoutButton'

/** stores.3dlab.jp 共通のヘッダー。3dlab.jp のワークショップ・スクールへの入口も置く */
export default async function StoreHeader() {
  const user = await currentStoreUser()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
            3D
          </span>
          <span className="font-bold text-gray-900">
            3DLab <span className="text-purple-600">みんなの作品ストア</span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-base text-gray-700">
          <a href={`${MAIN_SITE_URL}/workshops`} className="hover:text-purple-600">ワークショップ</a>
          <a href={`${MAIN_SITE_URL}/school`} className="hover:text-purple-600">スクール</a>
        </nav>

        <div className="ml-auto flex items-center gap-4 text-base">
          {user ? (
            <>
              <Link href="/sell" className="text-gray-700 hover:text-purple-600">
                {user.seller?.status === 'approved' ? '出品者メニュー' : '出品する'}
              </Link>
              <span className="text-gray-500 hidden sm:inline">{user.name} さん</span>
              <StoreLogoutButton className="text-gray-500 hover:text-purple-600" />
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
