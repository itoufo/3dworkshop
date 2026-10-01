'use client'

import { useCallback, useEffect, useState } from 'react'
import { STORE_CART_MAX_LINES, STORE_CART_MAX_QUANTITY } from './cart-limits'

/**
 * ストアのカート。本サイトのカート（lib/cart.ts）と同じ作り。ログイン不要で、この端末のブラウザにだけ持つ。
 * 持つのは「どの作品を・どの買い方で・どの組み合わせを・何個」だけ。価格は決済のときにサーバーが作品から決め直す。
 *
 * ⚠ 1明細は 作品 × 買い方（data / print）× 組み合わせ で決まる。同じ作品の 7cm と 10cm は別の明細。
 * ⚠ データは1つしか持たない（同じデータを2つ買う意味がない）。
 * ⚠ localStorage は使えないことがある。読み書きは try/catch で包み、使えなければ空のカートとして扱う。
 */

export interface StoreCartLine {
  productId: string
  kind: 'data' | 'print'
  /** 完成品の組み合わせ。選択肢の無い作品・データは null */
  variantId: string | null
  quantity: number
}

const KEY = 'stores-3dlab-cart-v1'
const CHANGE_EVENT = 'stores-3dlab-cart-change'
const PENDING_KEY = 'stores-3dlab-cart-checkout'

export function lineKey(l: Pick<StoreCartLine, 'productId' | 'kind' | 'variantId'>): string {
  return `${l.productId}:${l.kind}:${l.variantId ?? ''}`
}

function clamp(kind: StoreCartLine['kind'], q: number): number {
  if (kind === 'data') return 1
  return Math.max(1, Math.min(STORE_CART_MAX_QUANTITY, Math.floor(q) || 1))
}

function read(): StoreCartLine[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (l) =>
          l &&
          typeof l.productId === 'string' &&
          /^[0-9a-f-]{36}$/i.test(l.productId) &&
          (l.kind === 'data' || l.kind === 'print') &&
          (l.variantId === null || typeof l.variantId === 'string') &&
          Number.isFinite(l.quantity),
      )
      // データは組み合わせを持たない（サーバー側の明細の鍵と合わせる）
      .map((l) => ({
        productId: l.productId,
        kind: l.kind,
        variantId: l.kind === 'data' ? null : l.variantId,
        quantity: clamp(l.kind, l.quantity),
      }))
      .slice(0, STORE_CART_MAX_LINES)
  } catch {
    return []
  }
}

function write(lines: StoreCartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
  } catch {
    // 保存できない環境。表示中のこのページの中だけで持つ
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** @returns 実際にカートに入っている数量と、上限で減らしたか */
export function addToStoreCart(line: Omit<StoreCartLine, 'quantity'>, quantity: number): { quantity: number; capped: boolean } {
  const lines = read()
  if (line.kind === 'data') line = { ...line, variantId: null }
  const existing = lines.find((l) => lineKey(l) === lineKey(line))
  const wanted = (existing?.quantity ?? 0) + quantity
  const result = clamp(line.kind, wanted)
  if (existing) {
    existing.quantity = result
  } else {
    if (lines.length >= STORE_CART_MAX_LINES) throw new Error(`カートに入れられるのは ${STORE_CART_MAX_LINES} 種類までです`)
    lines.push({ ...line, quantity: result })
  }
  write(lines)
  return { quantity: result, capped: result < wanted }
}

export function setStoreCartQuantity(key: string, quantity: number) {
  write(read().map((l) => (lineKey(l) === key ? { ...l, quantity: clamp(l.kind, quantity) } : l)))
}

export function removeFromStoreCart(key: string) {
  write(read().filter((l) => lineKey(l) !== key))
}

/**
 * 決済に進む直前に、送った明細を決済ごと（checkout_id）に覚えておく（決済完了でその分だけ引くため）。
 * ⚠ 1つだけ覚えると、2つのタブで同時に決済へ進んだとき別の決済の分を引いてしまう
 */
export function rememberStoreCheckout(checkoutId: string, lines: StoreCartLine[]) {
  try {
    const all = JSON.parse(window.localStorage.getItem(PENDING_KEY) || '{}')
    const map: Record<string, { at: number; lines: StoreCartLine[] }> =
      all && typeof all === 'object' && !Array.isArray(all) ? all : {}
    // 決済をやめた分は残り続けるので、1日たったものは捨てる
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
 * ⚠ カートを丸ごと空にしない。決済画面にいる間に別のタブで入れた作品まで消えてしまう
 */
export function settleStoreCheckout(checkoutId: string) {
  let paid: StoreCartLine[] = []
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
      const p = paid.find((x) => lineKey(x) === lineKey(l))
      return p ? { ...l, quantity: l.quantity - p.quantity } : l
    })
    .filter((l) => l.quantity > 0)
  write(next)
}

/** カートの中身。変わると再描画される（同じタブ・別タブとも） */
export function useStoreCart(): { lines: StoreCartLine[]; count: number; ready: boolean } {
  const [lines, setLines] = useState<StoreCartLine[]>([])
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
