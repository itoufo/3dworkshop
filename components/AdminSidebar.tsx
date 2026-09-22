'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
 * ⚠ ダッシュボードの中身はタブで切り替わる。リンク先は `/admin?tab=xxx`。
 *   タブ名は app/admin/page.tsx の activeTab と、URL を読む useEffect の許可リストに揃える。
 *   （揃っていないタブ名はリンクを踏んでも何も起きない）
 */

type NavItem = { href: string; label: string; icon: typeof Home; tab?: string }
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
      { href: '/admin?tab=workshops', label: 'ワークショップ', icon: Calendar, tab: 'workshops' },
      { href: '/admin?tab=categories', label: 'カテゴリ', icon: FolderTree, tab: 'categories' },
      { href: '/admin/school', label: 'スクール生管理', icon: BookOpen },
    ],
  },
  {
    title: '売るもの',
    items: [
      { href: '/admin/products', label: '商品管理', icon: Package },
      { href: '/admin/cookie-cutter', label: 'クッキー型の注文', icon: Cookie },
      { href: '/admin?tab=coupons', label: 'クーポン', icon: Tag, tab: 'coupons' },
    ],
  },
  {
    title: '発信',
    items: [
      { href: '/admin?tab=blog', label: 'ブログ', icon: FileText, tab: 'blog' },
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
  /** リンクを踏んだとき・閉じるボタンを押したとき。スマホの引き出しを閉じる */
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')

  function isActive(item: NavItem): boolean {
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
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onNavigate}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[80%] bg-white h-full overflow-y-auto p-4 shadow-xl">
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
