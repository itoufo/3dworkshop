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

/**
 * @param maxQuantity その商品をカートに入れておける上限（在庫数）。受注製作なら省略
 * @returns 実際にカートに入っている数量と、上限で減らしたか
 */
export function addToCart(
  productId: string,
  quantity: number,
  maxQuantity?: number,
): { quantity: number; capped: boolean } {
  const lines = read()
  const cap = (q: number) => Math.min(clampQuantity(q), maxQuantity ?? MAX_LINE_QUANTITY)
  const existing = lines.find((l) => l.productId === productId)
  const wanted = (existing?.quantity ?? 0) + quantity
  let result: number
  if (existing) {
    existing.quantity = cap(wanted)
    result = existing.quantity
  } else {
    if (lines.length >= MAX_LINES) throw new Error(`カートに入れられるのは ${MAX_LINES} 種類までです`)
    result = cap(wanted)
    lines.push({ productId, quantity: result })
  }
  write(lines)
  return { quantity: result, capped: result < wanted }
}

export function setCartQuantity(productId: string, quantity: number) {
  write(read().map((l) => (l.productId === productId ? { ...l, quantity: clampQuantity(quantity) } : l)))
}

export function removeFromCart(productId: string) {
  write(read().filter((l) => l.productId !== productId))
}

const PENDING_KEY = '3dlab-cart-checkout'

/**
 * 決済に進む直前に、送った商品と数量を決済ごと（checkout_id）に覚えておく（決済完了でその分だけ引くため）。
 * ⚠ 1つだけ覚えると、2つのタブで同時に決済へ進んだとき別の決済の分を引いてしまう
 */
export function rememberCheckout(checkoutId: string, lines: CartLine[]) {
  try {
    const all = JSON.parse(window.localStorage.getItem(PENDING_KEY) || '{}')
    const map: Record<string, { at: number; lines: CartLine[] }> =
      all && typeof all === 'object' && !Array.isArray(all) ? all : {}
    // 決済をやめた分は残り続けるので、1日たったものは捨てる（Stripe の決済画面も24時間で失効する）
    for (const [id, entry] of Object.entries(map)) {
      if (!entry || typeof entry.at !== 'number' || Date.now() - entry.at > 24 * 60 * 60 * 1000) delete map[id]
    }
    map[checkoutId] = { at: Date.now(), lines }
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(map))
  } catch {
    // 覚えられなければ、決済完了でカートには触らない
  }
}

/**
 * 決済が終わったら、決済に送った分だけをカートから引く。
 * ⚠ カートを丸ごと空にしない。決済画面にいる間に別のタブで入れた商品まで消えてしまう
 */
export function settleCheckout(checkoutId: string) {
  let paid: CartLine[] = []
  try {
    const all = JSON.parse(window.localStorage.getItem(PENDING_KEY) || '{}')
    if (!all || typeof all !== 'object' || Array.isArray(all)) return
    paid = all[checkoutId]?.lines ?? []
    delete all[checkoutId]
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(all))
  } catch {
    return
  }
  if (!Array.isArray(paid) || paid.length === 0) return
  const next = read()
    .map((l) => {
      const p = paid.find((x) => x.productId === l.productId)
      return p ? { ...l, quantity: l.quantity - p.quantity } : l
    })
    .filter((l) => l.quantity > 0)
  write(next)
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
