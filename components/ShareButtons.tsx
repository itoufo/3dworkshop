'use client'

import { useEffect, useState } from 'react'
import { Link2, Check, Share2 } from 'lucide-react'

interface Props {
  url: string
  title: string
}

/**
 * X / LINE / Facebook / リンクコピーの共有ボタン。
 * スマホなど navigator.share が使える環境では OS の共有シートも出す。
 */
export default function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false)
  // navigator.share の有無はサーバー側で判定できないため、マウント後に決める（hydration ずれ防止）
  const [canNativeShare, setCanNativeShare] = useState(false)

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const links = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'LINE', href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedTitle}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
  ]

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // クリップボードが使えない環境では何もしない（リンクは各SNSボタンから共有できる）
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url })
    } catch {
      // ユーザーがキャンセルした場合も例外になるため、ここでは何もしない
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-600 mr-1">この商品をシェア</span>

      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 text-sm font-medium rounded-full border-2 border-gray-200 text-gray-700 bg-white hover:border-purple-500 hover:text-purple-700 transition-colors"
        >
          {link.label}
        </a>
      ))}

      <button
        type="button"
        onClick={copyLink}
        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border-2 border-gray-200 text-gray-700 bg-white hover:border-purple-500 hover:text-purple-700 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Link2 className="w-4 h-4 mr-1" />}
        {copied ? 'コピーしました' : 'リンクをコピー'}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-full border-2 border-gray-200 text-gray-700 bg-white hover:border-purple-500 hover:text-purple-700 transition-colors"
        >
          <Share2 className="w-4 h-4 mr-1" />
          その他
        </button>
      )}
    </div>
  )
}
