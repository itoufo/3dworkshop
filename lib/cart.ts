'use client'

import { useCallback, useEffect, useState } from 'react'
import { MAX_LINES, MAX_LINE_QUANTITY } from '@/lib/cart-limits'

export { MAX_LINES, MAX_LINE_QUANTITY }

/**
 * 物販のカート。ログイン不要で、この端末のブラウザ（localStorage）にだけ持つ。
 * 持つのは「どの商品を何点」だけ。値段や在庫は決済のときにサーバーが DB から取り直す。
 *
 * ⚠ localStorage は使えないこと（プライベートモード・保存ブロック）がある。
 *   読み書きは必ず try/catch で包み、使えなければ空のカートとして扱う。
 */

export interface CartLine {
  productId: string
  quantity: number
}

const KEY = '3dlab-cart-v1'
const CHANGE_EVENT = '3dlab-cart-change'

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((l) => l && typeof l.productId === 'string' && Number.isFinite(l.quantity))
      .map((l) => ({ productId: l.productId, quantity: clampQuantity(l.quantity) }))
      .slice(0, MAX_LINES)
  } catch {
    return []
  }
}

function write(lines: CartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    // 保存できない環境。表示中のこのページの中だけで持つ
  }
  // 同じタブの他の部品（ヘッダーの点数など）に知らせる。別タブには storage イベントが届く
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function clampQuantity(q: number): number {
  return Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.floor(q) || 1))
}

export function addToCart(productId: string, quantity: number) {
  const lines = read()
  const existing = lines.find((l) => l.productId === productId)
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity)
  } else {
    if (lines.length >= MAX_LINES) throw new Error(`カートに入れられるのは ${MAX_LINES} 種類までです`)
    lines.push({ productId, quantity: clampQuantity(quantity) })
  }
  write(lines)
}

export function setCartQuantity(productId: string, quantity: number) {
  write(read().map((l) => (l.productId === productId ? { ...l, quantity: clampQuantity(quantity) } : l)))
}

export function removeFromCart(productId: string) {
  write(read().filter((l) => l.productId !== productId))
}

export function clearCart() {
  write([])
}

/** カートの中身。変わると再描画される（同じタブ・別タブとも） */
export function useCart(): { lines: CartLine[]; count: number; ready: boolean } {
  const [lines, setLines] = useState<CartLine[]>([])
  const [ready, setReady] = useState(false)

  const refresh = useCallback(() => {
    setLines(read())
    setReady(true)
  }, [])

  useEffect(() => {
    refresh()
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) refresh()
    }
    window.addEventListener(CHANGE_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh])

  return { lines, count: lines.reduce((sum, l) => sum + l.quantity, 0), ready }
}
