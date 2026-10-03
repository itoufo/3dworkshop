'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useStoreCart } from '@/lib/store/cart'
import { storePath } from '@/lib/store/locale'
import { useStoreLocale } from './StoreLocale'

/** ストアのヘッダーのカート（本サイトの CartLink と同じ。中身があるときだけ出す） */
export default function StoreCartLink() {
  const { count, ready } = useStoreCart()
  const locale = useStoreLocale()
  if (!ready || count === 0) return null
  return (
    <Link
      href={storePath(locale, '/cart')}
      aria-label={locale === 'en' ? `Cart (${count} ${count === 1 ? 'item' : 'items'})` : `カート（${count} 点）`}
      className="relative flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:border-purple-400 hover:text-purple-600 transition-colors"
    >
      <ShoppingCart className="w-4 h-4 shrink-0" />
      <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
        {count}
      </span>
    </Link>
  )
}
