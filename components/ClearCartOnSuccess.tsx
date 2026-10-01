'use client'

import { useEffect } from 'react'
import { settleCheckout } from '@/lib/cart'

/** カートで決済を終えて戻ってきたら、決済した分だけカートから引く（1商品ずつの決済から来たときは触らない） */
export default function ClearCartOnSuccess() {
  useEffect(() => {
    const checkoutId = new URLSearchParams(window.location.search).get('checkout_id')
    if (checkoutId) settleCheckout(checkoutId)
  }, [])
  return null
}
