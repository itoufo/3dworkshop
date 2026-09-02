/**
 * お客様の入力情報（お名前・連絡先など）を、この端末のブラウザにだけ覚えておく仕組み。
 * ログインを伴う会員登録ではなく、次回の入力を省くためのもの。
 * サーバーには送らない。保存するかどうかは各フォームのチェックボックスでお客様が選ぶ。
 */

export const CUSTOMER_PROFILE_STORAGE_KEY = '3dlab_customer_profile_v1'

export interface CustomerProfile {
  name?: string
  email?: string
  phone?: string
  address?: string
  age?: string
  gender?: string
  /** 最後に保存した日時（ISO文字列）。表示用 */
  savedAt?: string
}

/** 空文字・undefined を落として、値のあるキーだけにする */
function compact(profile: CustomerProfile): CustomerProfile {
  return Object.fromEntries(
    Object.entries(profile).filter(([, value]) => typeof value === 'string' && value.trim() !== '')
  ) as CustomerProfile
}

export function loadCustomerProfile(): CustomerProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CustomerProfile
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    // プライベートブラウズなど localStorage が使えない環境では「保存なし」として扱う
    return null
  }
}

export function saveCustomerProfile(profile: CustomerProfile): void {
  if (typeof window === 'undefined') return
  try {
    const next = compact(profile)
    if (Object.keys(next).length === 0) return
    next.savedAt = new Date().toISOString()
    window.localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // 保存できなくても入力・決済は続行できるので、ここでは何もしない
  }
}

export function clearCustomerProfile(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CUSTOMER_PROFILE_STORAGE_KEY)
  } catch {
    // 同上
  }
}
