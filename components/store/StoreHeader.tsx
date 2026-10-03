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
      {/*
        並べ方:
          640px 以上 … 1行（ロゴ / ナビ / 右端に 言語・カート・ログイン）
          それ未満   … 1行目にロゴと言語の切り替え、2行目にナビと右側（カート・ログイン）
        ⚠ 言語の切り替えは幅ごとに置き場所が違うので、2か所に書いて片方だけ表示している
          （order で並べ替えると、Tab キーで進む順が見た目と食い違う）。
        ⚠ 2行目が入りきらない幅（未ログインの日本語で 320px、カートに品物があると 390px 以下）では
          右側が3行目に折れる。これは言語の切り替えを足す前と同じ。
      */}
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

        <StoreLanguageSwitch className="ml-auto sm:hidden text-base text-gray-500 hover:text-purple-600" />

        {/* 640px 未満では2行目のひとかたまり。640px 以上では枠を消して（contents）、中身を上の行に並べる */}
        <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 sm:contents">
          <nav className="flex items-center gap-5 text-base text-gray-700">
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
            <StoreLanguageSwitch className="hidden sm:inline text-gray-500 hover:text-purple-600" />
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
      </div>
    </StoreHeaderFrame>
  )
}
