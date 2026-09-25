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
  alternates: { canonical: '/' },
  openGraph: {
    siteName: '3DLab みんなの作品ストア',
    url: STORE_URL,
    locale: 'ja_JP',
    type: 'website',
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
