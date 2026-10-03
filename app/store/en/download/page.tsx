import type { Metadata } from 'next'
import DownloadClient from '../../download/DownloadClient'

export const metadata: Metadata = {
  title: 'Download your data',
  robots: { index: false, follow: false },
}

/**
 * 英語の購入メールのリンクの行き先（/en/download#<合言葉>）。
 * 決まりごとは日本語のページ（app/store/download/page.tsx）と同じ。合言葉は # の後ろに置く。
 */
export default function StoreEnglishDownloadPage() {
  return (
    <div lang="en">
      <DownloadClient />
    </div>
  )
}
