'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, Tag, BookOpen, Settings, Package, ChevronRight } from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'ダッシュボード', icon: Home },
  { href: '/admin/workshops', label: 'ワークショップ', icon: Calendar },
  { href: '/admin/school', label: 'スクール生管理', icon: BookOpen },
  { href: '/admin/bookings', label: '予約管理', icon: Users },
  { href: '/admin/coupons', label: 'クーポン', icon: Tag },
  { href: '/admin/products', label: '商品管理', icon: Package },
  { href: '/admin/settings', label: '設定', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white shadow-lg h-screen sticky top-0">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">メニュー</h2>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
                           (item.href !== '/admin' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}