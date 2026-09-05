import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * 記事サイドバーの広告枠。
 *
 * 隣に並ぶワークショップの案内は「サイトが自分の中身へ案内するもの」で、こちらは広告。
 * 見た目が同じだと読者が区別できないので、必ず「PR」の表示を出し、
 * 記事本文とは違う枠であることを分かるようにしている。
 *
 * 出す広告は下の ADS を差し替える。複数入れると縦に並ぶ。
 */

export interface SidebarAd {
  /** 一覧の識別用。React の key に使う */
  id: string
  title: string
  body: string
  /** ボタンの文言 */
  cta: string
  href: string
  /** 外部サイトなら true。新しいタブで開き、rel を付ける */
  external?: boolean
}

/**
 * 掲載中の広告。
 *
 * リンク先は**入手ページ**（/download）にする。トップページへ送るとブラウザ版が
 * 主役に見えるが、造形機へデータを送れるのはデスクトップ版だけなので、
 * この読者に見せたいのはそちら。
 *
 * TODO: 公開 URL は Vercel の既定ドメインのまま。独自ドメインを当てたら差し替える。
 */
export const ADS: SidebarAd[] = [
  {
    id: 'slicer',
    title: '3DLab Slicer',
    body:
      'STL を入れて大きさを確認するだけ。向き・配置・サポートまで自動で決まる光造形スライサーを無料配布しています。macOS / Windows / Linux 対応。',
    cta: 'デスクトップ版を入手',
    href: 'https://3dslicerrejin.vercel.app/download',
    external: true,
  },
]

function AdCard({ ad }: { ad: SidebarAd }) {
  const external = ad.external
    ? { target: '_blank' as const, rel: 'noopener noreferrer sponsored' }
    : {}

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-lg text-gray-900">{ad.title}</h3>
        <span className="shrink-0 rounded-full border border-gray-300 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-gray-500">
          PR
        </span>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-gray-600">{ad.body}</p>
      <Link
        href={ad.href}
        {...external}
        className="flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
      >
        {ad.cta}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </div>
  )
}

export default function BlogSidebarAd() {
  if (ADS.length === 0) return null
  return (
    <>
      {ADS.map((ad) => (
        <AdCard key={ad.id} ad={ad} />
      ))}
    </>
  )
}
