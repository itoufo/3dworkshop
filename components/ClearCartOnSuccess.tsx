'use client'

import { useEffect } from 'react'
import { clearCart } from '@/lib/cart'

/** カートで決済を終えて戻ってきたら、カートを空にする（1商品ずつの決済から来たときは触らない） */
export default function ClearCartOnSuccess() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout_id')) clearCart()
  }, [])
  return null
}
