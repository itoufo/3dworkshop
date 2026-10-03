import Link from 'next/link'
import { currentStoreUser } from '@/lib/store/session'
import { MAIN_SITE_URL } from '@/lib/store/urls'
import StoreLogoutButton from './StoreLogoutButton'
import StoreCartLink from './StoreCartLink'
import { ByStoreLocale, StoreHeaderFrame, StoreHomeLink, StoreLanguageSwitch } from './StoreLocale'

/**
 * stores.3dlab.jp 共通のヘッダー。3dlab.jp のワークショップ・スクールへの入口も置く。
 * 英語のページ（/en）では文言だけ英語に切り替わる（ByStoreLocale）。
 */
export default async function StoreHeader() {
  const user = await currentStoreUser()

  return (
    <StoreHeaderFrame className="bg-white border-b border-gray-200">
      {/* スマホ: 1行目にロゴと右側（言語・ログイン）、2行目にナビ。3行に増やさない */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-2">
        <StoreHomeLink className="flex items-center gap-2.5 shrink-0">
          <span className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold">
            3D
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-gray-900">3DLab Store</span>
            <ByStoreLocale ja={<span className="text-sm text-gray-500">みんなの作品ストア</span>} en={null} />
          </span>
        </StoreHomeLink>

        <nav className="order-last w-full sm:order-none sm:w-auto flex items-center gap-5 text-base text-gray-700">
          <ByStoreLocale
            ja={
              <>
                <a href={`${MAIN_SITE_URL}/workshops`} className="hover:text-purple-600">ワークショップ</a>
                <a href={`${MAIN_SITE_URL}/school`} className="hover:text-purple-600">スクール</a>
              </>
            }
            en={
              <a href={`${MAIN_SITE_URL}/en/workshops`} className="hover:text-purple-600">Workshops</a>
            }
          />
        </nav>

        <div className="ml-auto flex items-center gap-4 text-base">
          <StoreLanguageSwitch className="text-gray-500 hover:text-purple-600" />
          <StoreCartLink />
          {user ? (
            <>
              <Link href="/sell" className="text-gray-700 hover:text-purple-600">
                <ByStoreLocale
                  ja={user.seller?.status === 'approved' ? '出品者メニュー' : '出品する'}
                  en={user.seller?.status === 'approved' ? 'Seller menu' : 'Sell'}
                />
              </Link>
              {/* 名前は本人が入れた文字なので、英語のヘッダーの中でも lang="ja" を付ける */}
              <span className="text-gray-500 hidden sm:inline">
                <ByStoreLocale ja={`${user.name} さん`} en={<span lang="ja">{user.name}</span>} />
              </span>
              <StoreLogoutButton className="text-gray-500 hover:text-purple-600" />
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium"
            >
              <ByStoreLocale ja="ログイン" en="Log in" />
            </Link>
          )}
        </div>
      </div>
    </StoreHeaderFrame>
  )
}
