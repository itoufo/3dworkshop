'use client'

import { useEffect } from 'react'
import { settleStoreCheckout } from '@/lib/store/cart'

/** 決済を終えて戻ってきたら、決済に送った分だけカートから引く */
export default function SettleStoreCart() {
  useEffect(() => {
    const checkoutId = new URLSearchParams(window.location.search).get('checkout')
    if (checkoutId) settleStoreCheckout(checkoutId)
  }, [])
  return null
}
