'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { LogOut, Home, Menu, Shield } from 'lucide-react'
import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  /** スマホの引き出しメニュー。PC では常に出ているので使わない */
  const [navOpen, setNavOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)

  // 行き先に着いたら引き出しは閉じる（開きっぱなしで中身が見えないのを防ぐ）
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  useEffect(() => {
    const authCookie = Cookies.get('admin_auth')
    if (authCookie === 'true') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // APIエンドポイントで認証
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      })
      
      if (response.ok) {
        Cookies.set('admin_auth', 'true', { expires: 1 }) // 1日有効
        setIsAuthenticated(true)
      } else {
        alert('パスワードが正しくありません')
      }
    } catch {
      alert('認証エラーが発生しました')
    }
  }

  const handleLogout = async () => {
    // ⚠ admin_auth を消すだけでは足りない。書き込み API の鍵は httpOnly の admin_session で、
    //   JS からは消せない。サーバーに消してもらわないと、ログアウト後も最大24時間
    //   知識の書き換えができる状態が残る
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch {
      // 消せなくても画面は閉じる。cookie は失効時刻で切れる
    }
    Cookies.remove('admin_auth')
    setIsAuthenticated(false)
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 via-white to-pink-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-10 -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full opacity-10 -ml-16 -mb-16" />
          
          <div className="relative">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              管理画面
            </h1>
            <p className="text-gray-600 text-center mb-8">パスワードを入力してください</p>
            
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              >
                ログイン
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-purple-600 transition-colors"
              >
                ← トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* スマホだけ。PC はサイドバーが常に出ている */}
              <button
                onClick={() => setNavOpen(true)}
                aria-label="メニューを開く"
                className="lg:hidden p-2 -ml-2 rounded-lg text-gray-600 hover:bg-purple-50 hover:text-purple-700"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  管理画面
                </h1>
                <p className="text-xs text-gray-500">3D Workshop Admin</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:text-purple-600 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>サイトを表示</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4" />
                <span>ログアウト</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        {/*
          ⚠ サイドバーは全ページ共通でここに1つだけ置く。各ページで <AdminSidebar /> を
            呼ばないこと（ダッシュボードだけ出ない、という以前の状態に戻る）。
          ⚠ Suspense で包む: サイドバーは選択中の判定に useSearchParams を使うため。
        */}
        <Suspense fallback={<div className="hidden lg:block w-60 shrink-0 border-r border-gray-200" />}>
          <AdminSidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
        </Suspense>
        {/* ⚠ min-w-0 が要る。無いと幅の広い表がサイドバーを押し出す */}
        <main className="flex-1 min-w-0 min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  )
}