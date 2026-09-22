'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { AdminTab } from '@/lib/admin-tabs'
import {
  Bell,
  BookOpen,
  Calendar,
  ClipboardList,
  Cookie,
  FileText,
  FolderTree,
  Home,
  Inbox,
  MessageCircle,
  MessageSquare,
  Package,
  Tag,
  Users,
  X,
} from 'lucide-react'

/**
 * 管理画面の左メニュー。app/admin/layout.tsx から全ページに出す。
 *
 * ⚠ ここが管理画面の行き先の一覧。ページを足したらここにも足す。
 *   以前はダッシュボードだけ横タブ、他のページだけサイドバーで、
 *   どちらからも相手に行けない画面があった。
 *
 * ⚠ ダッシュボードの中身は区画で切り替わる。リンク先は `/admin?tab=xxx`。
 *   区画名は lib/admin-tabs.ts が正本で、型で縛ってある（知らない名前は書けない）。
 */

type NavItem = {
  href: string
  label: string
  icon: typeof Home
  /** ダッシュボードの区画。/admin?tab=<これ> のとき選択中になる */
  tab?: AdminTab
  /**
   * この項目の配下とみなすURL。新規作成・編集の画面で選択中を保つために要る。
   * ⚠ これが無いと /admin/workshops/new などで左メニューのどこも光らず、
   *   今どこにいるか分からなくなる（旧サイドバーは前方一致で光っていた）
   */
  match?: string
}
type NavGroup = { title: string | null; items: NavItem[] }

const groups: NavGroup[] = [
  {
    title: null,
    items: [{ href: '/admin', label: 'ダッシュボード', icon: Home }],
  },
  {
    title: '予約と顧客',
    items: [
      { href: '/admin?tab=bookings', label: '予約管理', icon: Calendar, tab: 'bookings' },
      { href: '/admin?tab=customers', label: '顧客管理', icon: Users, tab: 'customers' },
      { href: '/admin?tab=requests', label: 'リクエスト', icon: Inbox, tab: 'requests' },
    ],
  },
  {
    title: '開催するもの',
    items: [
      { href: '/admin?tab=workshops', label: 'ワークショップ', icon: Calendar, tab: 'workshops', match: '/admin/workshops' },
      { href: '/admin?tab=categories', label: 'カテゴリ', icon: FolderTree, tab: 'categories', match: '/admin/categories' },
      { href: '/admin/school', label: 'スクール生管理', icon: BookOpen },
    ],
  },
  {
    title: '売るもの',
    items: [
      { href: '/admin/products', label: '商品管理', icon: Package },
      { href: '/admin/cookie-cutter', label: 'クッキー型の注文', icon: Cookie },
      { href: '/admin?tab=coupons', label: 'クーポン', icon: Tag, tab: 'coupons', match: '/admin/coupons' },
    ],
  },
  {
    title: '発信',
    items: [
      { href: '/admin?tab=blog', label: 'ブログ', icon: FileText, tab: 'blog', match: '/admin/blog' },
      { href: '/admin?tab=notifications', label: '通知', icon: Bell, tab: 'notifications' },
      { href: '/admin?tab=surveys', label: 'アンケート', icon: ClipboardList, tab: 'surveys' },
    ],
  },
  {
    title: 'チャット',
    items: [
      { href: '/admin/chat-knowledge', label: 'チャットの知識', icon: MessageCircle },
      { href: '/admin/chat-logs', label: 'チャットの履歴', icon: MessageSquare },
    ],
  },
]

export default function AdminSidebar({
  open = false,
  onNavigate,
}: {
  /** スマホで開いているか（PCでは常に出ているので関係ない） */
  open?: boolean
  /**
   * リンクを踏んだとき・閉じるボタンを押したとき。スマホの引き出しを閉じる。
   * ⚠ 必須。省けるようにすると、引き出しを開いたら閉じられない画面が作れてしまう
   */
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')

  // 引き出しが開いている間だけ。⚠ 背後が動くと、閉じたときに別の場所に飛ぶ
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onNavigate()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onNavigate])

  function isActive(item: NavItem): boolean {
    // 新規作成・編集の画面（/admin/blog/new など）もその項目の配下として光らせる
    if (item.match && (pathname === item.match || pathname.startsWith(`${item.match}/`))) return true
    if (item.tab) return pathname === '/admin' && currentTab === item.tab
    // ダッシュボードは「タブ指定なしで /admin にいるとき」だけ。
    // ⚠ ここを前方一致にすると、どのページにいてもダッシュボードが選択中に見える
    if (item.href === '/admin') return pathname === '/admin' && !currentTab
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  const nav = (
    <nav className="space-y-6">
      {groups.map((group, i) => (
        <div key={group.title ?? `group-${i}`}>
          {group.title && (
            <p className="px-3 mb-2 text-xs font-bold tracking-wide text-gray-400">{group.title}</p>
          )}
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  // ⚠ ?tab= の9本は実体が同じルート（/admin）なので、先読みさせると
                  //   管理画面を開くたびに同じ中身を9回取りに行く
                  prefetch={item.tab ? false : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                  }`}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className="text-base font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <>
      {/* PC。⚠ ヘッダー（h-16）の下に貼り付ける。top-0 にするとヘッダーに潜り込む */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-gray-200 bg-white/80">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto p-4">{nav}</div>
      </aside>

      {/* スマホ。ヘッダーのボタンで開く引き出し */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* 背景。押すと閉じる。⚠ これは補助でしかないので、閉じる手段は
              右上のボタンと Escape の2つを必ず残す（支援技術からは押せない） */}
          <div className="absolute inset-0 bg-black/40" onClick={onNavigate} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="管理画面のメニュー"
            className="relative w-72 max-w-[80%] bg-white h-full overflow-y-auto p-4 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-lg font-bold text-gray-900">メニュー</p>
              <button
                onClick={onNavigate}
                aria-label="メニューを閉じる"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  )
}
