'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'
import { hasEnglishPage, storePath, type StoreLocale } from '@/lib/store/locale'

/**
 * いま開いているストアのページの言語。英語なのは /en 以下（app/store/en）。
 * ⚠ stores.3dlab.jp では /en、ローカルで直接開くと /store/en になるので両方を見る。
 * ⚠ ヘッダー・フッターは app/store/layout.tsx に1つだけあり、レイアウトは開いているパスを
 *   知らない。そのため、言語で変わる部分だけをこの部品（ブラウザ側でパスを読む）に切り出している。
 */
export function useStoreLocale(): StoreLocale {
  const pathname = usePathname() ?? ''
  return /^\/(store\/)?en(\/|$)/.test(pathname) ? 'en' : 'ja'
}

/**
 * ストアのヘッダーの外枠。英語のページでは lang="en" を付ける。
 * ⚠ <html lang="ja"> はルートレイアウトで固定で、ページ本文の lang="en" はヘッダーを包まない。
 *   付けないと、英語の文言が日本語として読み上げられる。
 */
export function StoreHeaderFrame({ className, children }: { className?: string; children: ReactNode }) {
  const locale = useStoreLocale()
  return (
    <header className={className} lang={locale === 'en' ? 'en' : undefined}>
      {children}
    </header>
  )
}

/** 言語ごとの文言・部品のうち、いまの言語のほうだけを出す */
export function ByStoreLocale({ ja, en }: { ja: ReactNode; en: ReactNode }) {
  return <>{useStoreLocale() === 'en' ? en : ja}</>
}

/** ストアのトップへのリンク（英語のページからは英語のトップへ） */
export function StoreHomeLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link href={useStoreLocale() === 'en' ? '/en' : '/'} className={className}>
      {children}
    </Link>
  )
}

/**
 * もう一方の言語への切り替え。
 *   英語のページ → 同じページの日本語版（英語があるページには必ず日本語版がある）
 *   日本語のページ → 英語版があれば同じページの英語版、無ければ英語のトップ（lib/store/locale.ts の hasEnglishPage）
 * ⚠ 購入完了（?checkout=…）とダウンロード（#合言葉）は、言語を替えても同じ注文・同じデータを開けるよう、
 *   押したときにいまの URL のクエリと # を引き継ぐ。# はサーバーに届かないので、href にあらかじめ書けない。
 */
export function StoreLanguageSwitch({ className }: { className?: string }) {
  const pathname = usePathname() ?? ''
  const locale = useStoreLocale()
  // ストアのホストでの見た目のパス（ローカルで直接開いたときの /store を外す）から、日本語のパスを出す
  const visible = pathname.replace(/^\/store(?=\/|$)/, '') || '/'
  const japanesePath = visible.replace(/^\/en(?=\/|$)/, '') || '/'
  const target = locale === 'en' ? japanesePath : hasEnglishPage(japanesePath) ? storePath('en', japanesePath) : '/en'

  function keepQueryAndHash(event: MouseEvent<HTMLAnchorElement>) {
    const extra = window.location.search + window.location.hash
    if (!extra) return
    event.preventDefault()
    window.location.href = target + extra
  }

  return locale === 'en' ? (
    <Link href={target} lang="ja" hrefLang="ja" onClick={keepQueryAndHash} className={className}>
      日本語
    </Link>
  ) : (
    <Link href={target} lang="en" hrefLang="en" onClick={keepQueryAndHash} className={className}>
      English
    </Link>
  )
}
