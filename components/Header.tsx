'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ChevronDown, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { WorkshopCategory } from '@/types'

/**
 * ヘッダー。
 *
 * ⚠ 横一列に並べられるのは7項目まで。それを超えると文字が途中で折り返して読めなくなる
 *   （2026-09-02、10項目にしたときに「トッ／プ」のように割れた）。
 *   ページを増やすときは、新しい項目を足すのではなく NAV_GROUPS のまとまりに入れること。
 *
 * ⚠ 横並びに切り替えるのは lg（1024px）から。md（768px）では入りきらない。
 *   1024px での実測（2026-09-03、アンケート追加後）: ロゴ83px ＋ ナビ ＋ 左右余白64px。
 *   残りは100px前後しかない。項目を1つ増やすとこの余裕は消えるので、
 *   増やすときは NAV_ENTRIES のまとまりに入れること。
 */

/** ドロップダウンで開くまとまり。まとまり自体はページを持たない */
interface NavGroup {
  label: string
  items: { href: string; label: string }[]
}

/** 単独のリンクか、まとまりか */
type NavEntry = { href: string; label: string } | NavGroup

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry
}

/**
 * ロゴの右に並べる項目。
 * ワークショップは講座カテゴリを読み込んで出すため、ここには入れず個別に描く。
 */
const NAV_ENTRIES: NavEntry[] = [
  { href: '/school', label: 'スクール' },
  {
    label: 'オーダーメイド',
    items: [
      { href: '/cookie-cutter', label: 'クッキー型メーカー' },
      { href: '/products', label: '3Dプリント制作' },
    ],
  },
  {
    label: '法人向け',
    items: [
      { href: '/business', label: '出張・研修' },
      { href: '/partner', label: '導入プラン' },
    ],
  },
  { href: '/blog', label: 'ブログ' },
  { href: '/survey', label: 'アンケート' },
  {
    label: '会社案内',
    items: [
      { href: '/team', label: 'スタッフ紹介' },
      { href: '/recruit', label: '採用' },
    ],
  },
]

const linkClass =
  'text-gray-700 hover:text-purple-600 font-medium transition-colors whitespace-nowrap'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [workshopDropdownOpen, setWorkshopDropdownOpen] = useState(false)
  /** いま開いているまとまりの名前。同時に開くのは1つだけ */
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [mobileWorkshopExpanded, setMobileWorkshopExpanded] = useState(false)
  const [categories, setCategories] = useState<WorkshopCategory[]>([])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setMobileWorkshopExpanded(false)
  }

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('workshop_categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (data) setCategories(data as WorkshopCategory[])
    }
    loadCategories()
  }, [])

  return (
    <>
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0" onClick={closeMenu}>
              <Image
                src="/logo.png"
                alt="3DLab"
                width={180}
                height={60}
                className="h-12 w-auto sm:h-14"
                sizes="168px"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-4 xl:space-x-6">
              {/* ⚠ ここに「トップ」を戻さない。左のロゴが同じ行き先で、
                  横一列に入る項目数の余裕もない（スマホのメニューには残してある） */}

              {/* ワークショップ ドロップダウン */}
              <div
                className="relative"
                onMouseEnter={() => setWorkshopDropdownOpen(true)}
                onMouseLeave={() => setWorkshopDropdownOpen(false)}
              >
                <Link href="/workshops" className={`${linkClass} flex items-center`}>
                  ワークショップ
                  <ChevronDown
                    className={`w-4 h-4 ml-0.5 transition-transform ${
                      workshopDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Link>
                {workshopDropdownOpen && categories.length > 0 && (
                  <div className="absolute left-0 top-full pt-2 w-64">
                    <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                      <Link
                        href="/workshops"
                        className="block px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-50 border-b border-gray-100"
                        onClick={() => setWorkshopDropdownOpen(false)}
                      >
                        全てのワークショップ →
                      </Link>
                      <Link
                        href="/workshops/categories"
                        className="block px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-50 border-b border-gray-100"
                        onClick={() => setWorkshopDropdownOpen(false)}
                      >
                        📂 カテゴリ一覧 →
                      </Link>
                      <div className="max-h-96 overflow-y-auto">
                        {categories.map((cat) => (
                          <Link
                            key={cat.id}
                            href={`/workshops/category/${cat.slug}`}
                            className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                            onClick={() => setWorkshopDropdownOpen(false)}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {NAV_ENTRIES.map((entry) =>
                isGroup(entry) ? (
                  <div
                    key={entry.label}
                    className="relative"
                    onMouseEnter={() => setOpenGroup(entry.label)}
                    onMouseLeave={() => setOpenGroup(null)}
                  >
                    {/* まとまり自体は行き先を持たないのでボタン。押すと開閉する（キーボード操作用） */}
                    <button
                      type="button"
                      onClick={() => setOpenGroup(openGroup === entry.label ? null : entry.label)}
                      aria-expanded={openGroup === entry.label}
                      className={`${linkClass} flex items-center`}
                    >
                      {entry.label}
                      <ChevronDown
                        className={`w-4 h-4 ml-0.5 transition-transform ${
                          openGroup === entry.label ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {openGroup === entry.label && (
                      <div className="absolute left-0 top-full pt-2 w-56">
                        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                          {entry.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block px-4 py-3 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors"
                              onClick={() => setOpenGroup(null)}
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link key={entry.href} href={entry.href} className={linkClass}>
                    {entry.label}
                  </Link>
                )
              )}

              {/* マイページ。幅が足りないときはアイコンだけにする */}
              <Link
                href="/account"
                aria-label="マイページ"
                className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-gray-700 hover:border-purple-400 hover:text-purple-600 transition-colors"
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="hidden xl:inline text-sm font-medium whitespace-nowrap">
                  マイページ
                </span>
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="メニューを開く"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <div
        className={`lg:hidden fixed inset-x-0 top-16 bottom-0 bg-white border-t border-gray-200 shadow-lg transition-all duration-300 ease-in-out transform z-50 overflow-y-auto ${
          isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <nav className="px-4 py-6 space-y-2">
          <Link
            href="/"
            className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
            onClick={closeMenu}
          >
            トップ
          </Link>

          {/* ワークショップ - 折りたたみ */}
          <div>
            <div className="flex items-center">
              <Link
                href="/workshops"
                className="flex-1 px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
                onClick={closeMenu}
              >
                ワークショップ
              </Link>
              {categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileWorkshopExpanded(!mobileWorkshopExpanded)}
                  className="p-3 text-gray-500 hover:text-purple-600"
                  aria-label="カテゴリを展開"
                >
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${
                      mobileWorkshopExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              )}
            </div>
            {mobileWorkshopExpanded && categories.length > 0 && (
              <div className="ml-4 mt-1 pl-3 border-l-2 border-purple-200 space-y-1">
                <Link
                  href="/workshops/categories"
                  className="block px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-50 rounded transition-colors"
                  onClick={closeMenu}
                >
                  📂 カテゴリ一覧を見る
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/workshops/category/${cat.slug}`}
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    onClick={closeMenu}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* まとまりは畳まずに、見出しを付けて全部並べる。
              スマホは縦に伸ばせるので、階層を増やすより一覧で見せたほうが速い */}
          {NAV_ENTRIES.map((entry) =>
            isGroup(entry) ? (
              <div key={entry.label} className="pt-2">
                <p className="px-4 pb-1 text-sm font-bold text-gray-400">{entry.label}</p>
                {entry.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
                    onClick={closeMenu}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={entry.href}
                href={entry.href}
                className="block px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
                onClick={closeMenu}
              >
                {entry.label}
              </Link>
            )
          )}

          <div className="pt-4 mt-2 border-t border-gray-200">
            <Link
              href="/account"
              className="flex items-center gap-2 px-4 py-3 text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors"
              onClick={closeMenu}
            >
              <User className="w-5 h-5" />
              マイページ
            </Link>
          </div>
        </nav>
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={closeMenu}
          style={{ top: '64px' }}
        />
      )}
    </>
  )
}
