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
        並べ方（2026-10 に Chromium で測った値。フォントで数 px ずれる）:
          未ログイン・日本語     … 610px 以上は1行、337〜609px は2行、336px 以下は3行
          カートに品物があるとき … 683px 以上は1行、395〜682px は2行、394px 以下は3行
          英語（/en）            … 610px 以上は1行、それ未満は2行
          ログイン中は項目が増えるので、もっと広い幅まで2〜3行になる
        610px 未満では、1行目にロゴと言語の切り替え、その下にナビと右側（カート・ログイン）を置く。
        ⚠ 言語の切り替えは幅ごとに置き場所が違うので、2か所に書いて片方だけ表示している
          （order で並べ替えると、Tab キーで進む順が見た目と食い違う）。
        ⚠ 切り替えの幅を 610px にしているのは、未ログインの日本語が1行に収まる最小の幅だから。
          言語の切り替えを足す前のヘッダーも 610px から1行だった。640px（sm）にすると、
          610〜639px で以前より1行増える。
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

        <StoreLanguageSwitch className="ml-auto min-[610px]:hidden text-base text-gray-500 hover:text-purple-600" />

        {/* 610px 未満では2行目のひとかたまり。610px 以上では枠を消して（contents）、中身を上の行に並べる */}
        <div className="w-full flex flex-wrap items-center gap-x-4 gap-y-2 min-[610px]:contents">
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
            <StoreLanguageSwitch className="hidden min-[610px]:inline text-gray-500 hover:text-purple-600" />
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
