import type { Metadata } from 'next'
import DownloadClient from './DownloadClient'

export const metadata: Metadata = {
  title: 'データのダウンロード',
  robots: { index: false, follow: false },
}

/**
 * 購入メールのリンクの行き先（/download#<合言葉>）。
 * ⚠ 合言葉は URL の # の後ろに置く。パスやクエリに置くと Google アナリティクスや
 *   ヒートマップがページの URL ごと記録し、見られる人なら誰でもダウンロードできてしまう。
 *   # の後ろはサーバーにも計測にも送られない。
 * ⚠ ここではまだ数えない。ボタン（POST）を押したときだけ数える（メールの安全確認やプレビュー対策）。
 */
export default function StoreDownloadPage() {
  return <DownloadClient />
}
