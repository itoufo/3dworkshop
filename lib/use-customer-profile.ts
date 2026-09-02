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
 * 入れ元は2つある。
 *   1. この端末の localStorage（会員登録していない人向け）
 *   2. ログイン中の会員の情報（/api/account/me）
 *
 * ⚠ 2 は 1 のあとに当てる。会員の情報のほうが確かなので、
 *   この端末に残っている古い入力に負けないようにする。
 *
 * @param applySaved 値をフォームに反映する処理。上記のそれぞれで呼ばれる（最大2回）
 */
export function useCustomerProfile(applySaved: (saved: CustomerProfile) => void) {
  // 既定は「保存する」。チェックを外して送信すると、保存済みの内容も消す
  const [remember, setRemember] = useState(true)
  const [hasSaved, setHasSaved] = useState(false)
  /** ログイン中の会員の情報で埋めたか。画面に「入れました」と出すのに使う */
  const [fromAccount, setFromAccount] = useState(false)

  // applySaved は毎レンダーで作り直されるため、ref 経由で初回だけ使う
  const applySavedRef = useRef(applySaved)
  applySavedRef.current = applySaved

  useEffect(() => {
    const saved = loadCustomerProfile()
    if (saved) {
      setHasSaved(true)
      applySavedRef.current(saved)
    }

    // ログインしていれば、会員の情報で上書きする。
    // ⚠ ログイン状態の cookie は httpOnly で JS から読めないため、
    //   毎回この問い合わせが要る。していなければ { customer: null } が返るだけ
    let cancelled = false
    fetch('/api/account/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.customer) return
        applySavedRef.current(data.customer)
        setFromAccount(true)
      })
      .catch(() => {
        // 取れなくても手で入力できる。フォームは止めない
      })

    return () => {
      cancelled = true
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

  return { remember, setRemember, hasSaved, persist, forget, fromAccount }
}
