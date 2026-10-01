/**
 * ダッシュボード（/admin）の中で切り替わる区画の名前。
 *
 * ⚠ ここが唯一の一覧。URL の `?tab=` と左メニュー（components/AdminSidebar.tsx）と
 *   本体（app/admin/page.tsx）が同じものを指すように、3箇所とも必ずここから型を取る。
 *   以前は3箇所に書き写していて、横タブにボタンがあるのに URL の許可リストから
 *   'surveys' が漏れ、/admin?tab=surveys を踏んでも何も起きない状態になっていた。
 */
export const ADMIN_TABS = [
  'bookings',
  'customers',
  'workshops',
  'categories',
  'coupons',
  'blog',
  'requests',
  'notifications',
  'surveys',
] as const

export type AdminTab = (typeof ADMIN_TABS)[number]

/** 既定の区画。タブ指定なしで /admin に来たときに出すもの */
export const DEFAULT_ADMIN_TAB: AdminTab = 'bookings'

/** URL の `?tab=` を区画名に直す。知らない値なら既定に倒す */
export function toAdminTab(value: string | null | undefined): AdminTab {
  return ADMIN_TABS.includes(value as AdminTab) ? (value as AdminTab) : DEFAULT_ADMIN_TAB
}
