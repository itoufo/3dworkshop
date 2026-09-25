import type { Metadata } from 'next'
import StoreHeader from '@/components/store/StoreHeader'
import Footer from '@/components/Footer'
import { MAIN_SITE_URL, STORE_URL } from '@/lib/store/urls'

/**
 * stores.3dlab.jp（出品マーケット）。
 * ⚠ このディレクトリは stores.3dlab.jp のホストでだけ見せる。3dlab.jp/store/* は
 *   next.config.js で stores.3dlab.jp へ 301 している。
 */
export const metadata: Metadata = {
  metadataBase: new URL(STORE_URL),
  title: {
    // ⚠ ここには「| 3DLab」を付けない。app/layout.tsx の template（'%s | 3DLab'）が付ける
    default: 'みんなの作品ストア',
    template: '%s | 3DLab みんなの作品ストア',
  },
  description:
    '3DLab のスクール生がつくった 3D データと、3DLab が印刷してお届けする作品のストア。データをダウンロードして自分で印刷することも、完成品を届けてもらうこともできます。',
  // ⚠ canonical に URL を書かない。下のページすべてに引き継がれ、商品ページまで
  //   トップを正規URLと名乗ってしまう。各ページで自分の URL を書く。
  //   null で app/layout.tsx の canonical（https://3dlab.jp）も打ち消す。
  alternates: { canonical: null },
  openGraph: {
    siteName: '3DLab みんなの作品ストア',
    url: STORE_URL,
    locale: 'ja_JP',
    type: 'website',
    // ⚠ openGraph はここで丸ごと置き換わるので、画像も書き直す（無いと共有時に画像が出ない）
    images: [{ url: `${MAIN_SITE_URL}/og-image.jpg`, width: 1200, height: 630 }],
  },
}

// ヘッダーがログイン状態（cookie）を読むので、静的生成しない（ISR のルートで cookies() を呼ぶと本番で 500 になる）
export const dynamic = 'force-dynamic'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <Footer siteBase={MAIN_SITE_URL} />
    </div>
  )
}
