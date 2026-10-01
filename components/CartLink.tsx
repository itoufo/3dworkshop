'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart'

/**
 * ヘッダーのカート。中身があるときだけ出す（ワークショップを見に来た人のヘッダーを混ませない）。
 */
export default function CartLink() {
  const { count, ready } = useCart()
  if (!ready || count === 0) return null
  return (
    <Link
      href="/cart"
      aria-label={`カート（${count} 点）`}
      className="relative flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:border-purple-400 hover:text-purple-600 transition-colors"
    >
      <ShoppingCart className="w-4 h-4 shrink-0" />
      <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">
        {count}
      </span>
    </Link>
  )
}
