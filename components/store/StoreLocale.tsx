'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { StoreLocale } from '@/lib/store/top-copy'

/**
 * いま開いているストアのページの言語。英語なのは /en だけ（app/store/en）。
 * ⚠ stores.3dlab.jp では /en、ローカルで直接開くと /store/en になるので両方を見る。
 * ⚠ ヘッダー・フッターは app/store/layout.tsx に1つだけあり、レイアウトは開いているパスを
 *   知らない。そのため、言語で変わる部分だけをこの部品（ブラウザ側でパスを読む）に切り出している。
 */
export function useStoreLocale(): StoreLocale {
  const pathname = usePathname() ?? ''
  return /^\/(store\/)?en(\/|$)/.test(pathname) ? 'en' : 'ja'
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

/** もう一方の言語のトップへの切り替え */
export function StoreLanguageSwitch({ className }: { className?: string }) {
  const locale = useStoreLocale()
  return locale === 'en' ? (
    <Link href="/" lang="ja" hrefLang="ja" className={className}>
      日本語
    </Link>
  ) : (
    <Link href="/en" lang="en" hrefLang="en" className={className}>
      English
    </Link>
  )
}
