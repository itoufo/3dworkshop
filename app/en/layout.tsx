import type { Metadata } from 'next'

// 英語ページ（/en 以下）共通の設定。
// ⚠ <html lang="ja"> はルートレイアウトで固定なので、ここでは中身を lang="en" の要素で包むだけ。
//   ルートレイアウトを言語別に分ける作り替えはしていない
export const metadata: Metadata = {
  openGraph: { locale: 'en_US', siteName: '3DLab Tokyo', type: 'website' },
}

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <div lang="en">{children}</div>
}
