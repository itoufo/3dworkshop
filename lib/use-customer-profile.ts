'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearCustomerProfile,
  loadCustomerProfile,
  saveCustomerProfile,
  type CustomerProfile,
} from '@/lib/customer-profile'

/**
 * 保存済みの入力情報をフォームに流し込み、送信時に保存する/しないを選ばせるためのフック。
 *
 * @param applySaved 保存済みの値をフォームに反映する処理。マウント直後に1回だけ呼ばれる
 */
export function useCustomerProfile(applySaved: (saved: CustomerProfile) => void) {
  // 既定は「保存する」。チェックを外して送信すると、保存済みの内容も消す
  const [remember, setRemember] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)

  // applySaved は毎レンダーで作り直されるため、ref 経由で初回だけ使う
  const applySavedRef = useRef(applySaved)
  applySavedRef.current = applySaved

  useEffect(() => {
    const saved = loadCustomerProfile()
    if (saved) {
      setHasSaved(true)
      applySavedRef.current(saved)
    }
  }, [])

  /** 送信時に呼ぶ。チェックが入っていれば保存、外れていれば保存済みの内容を削除する */
  const persist = useCallback(
    (profile: CustomerProfile) => {
      if (remember) {
        saveCustomerProfile(profile)
        setHasSaved(true)
      } else {
        clearCustomerProfile()
        setHasSaved(false)
      }
    },
    [remember]
  )

  /** 「保存した内容を削除」ボタン用 */
  const forget = useCallback(() => {
    clearCustomerProfile()
    setHasSaved(false)
    setRemember(false)
  }, [])

  return { remember, setRemember, hasSaved, persist, forget }
}
