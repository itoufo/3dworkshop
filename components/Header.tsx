'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { Menu, X, ChevronDown, User, Globe, ArrowRight, LayoutGrid } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { WorkshopCategory } from '@/types'
import { englishPathFor, japanesePathFor } from '@/lib/i18n'
import { optimizeImageUrl } from '@/lib/image-optimization'
import CartLink from '@/components/CartLink'
import { jstToday, sessionStartJst } from '@/lib/booking-deadline'

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
      // 出品マーケット（別サブドメイン。next/link は外部 URL もそのまま <a> で出す）
      { href: 'https://stores.3dlab.jp', label: 'みんなの作品ストア' },
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

/** 英語ページ（/en）のヘッダー項目。英語版のあるページだけ */
const EN_NAV: { href: string; label: string }[] = [
  { href: '/en/workshops', label: 'Workshops' },
  { href: '/en#access', label: 'Access' },
  { href: '/en/faq', label: 'FAQ' },
]

const linkClass =
  'text-gray-700 hover:text-purple-600 font-medium transition-colors whitespace-nowrap'

/**
 * カテゴリ名の先頭の「【フィギュア】」を、ラベルと残りの名前に分ける。
 * プルダウンではラベルを小さく上に出す（名前が1行短くなり、種類がひと目で分かる）。
 * 【】で始まらない名前はそのまま返す。
 */
function splitCategoryName(name: string): { tag: string | null; title: string } {
  const match = name.match(/^【(.+?)】\s*(.+)$/)
  return match ? { tag: match[1], title: match[2] } : { tag: null, title: name }
}

/**
 * next/image に渡せる画像 URL か。
 * 管理画面の画像 URL は自由入力で、next.config.js の remotePatterns に無いホストを渡すと
 * 本番は 400（空の枠）、開発は例外になる。ヘッダーは全ページにあるので、渡す前にここで弾く。
 */
function isOptimizableImageUrl(url: string): boolean {
  // サイト内のパス。`//host/...`（プロトコル相対）は外部ホストなので通さない
  if (url.startsWith('/')) return !url.startsWith('//')
  try {
    const { protocol, hostname } = new URL(url)
    // ⚠ next.config.js の images.remotePatterns と同じホストにそろえること
    return protocol === 'https:' && (hostname === 'images.unsplash.com' || hostname.endsWith('.supabase.co'))
  } catch {
    return false
  }
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [workshopDropdownOpen, setWorkshopDropdownOpen] = useState(false)
  /** プルダウンを閉じる予約。少し待ってから閉じる（理由は closeWorkshopDropdownSoon） */
  const workshopCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** いま開いているまとまりの名前。同時に開くのは1つだけ */
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [mobileWorkshopExpanded, setMobileWorkshopExpanded] = useState(false)
  const [categories, setCategories] = useState<WorkshopCategory[]>([])
  /** カテゴリごとの開催予定の日程数（開始前の回）。読み込み前は null */
  const [upcomingCounts, setUpcomingCounts] = useState<Map<string, number> | null>(null)
  const pathname = usePathname() || '/'
  const isEnglish = pathname === '/en' || pathname.startsWith('/en/')
  /** 英語版のあるワークショップ。日本語の詳細ページから英語へ切り替える先を決めるのに使う */
  const [englishWorkshopIds, setEnglishWorkshopIds] = useState<Set<string> | null>(null)
  const isWorkshopDetail = /^\/workshops\/[0-9a-f-]{36}$/.test(pathname)

  // 開催予定の日程が多い順。同数（0件どうし等）は管理画面の並び順のまま
  const sortedCategories = upcomingCounts
    ? [...categories].sort((a, b) => (upcomingCounts.get(b.id) ?? 0) - (upcomingCounts.get(a.id) ?? 0))
    : categories

  // 言語の切り替え先。英語版のないページからは /en のトップへ
  const switchHref = isEnglish
    ? japanesePathFor(pathname)
    : englishPathFor(pathname, isWorkshopDetail ? englishWorkshopIds ?? new Set() : undefined) ?? '/en'

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setMobileWorkshopExpanded(false)
  }

  const cancelWorkshopClose = () => {
    if (workshopCloseTimer.current) clearTimeout(workshopCloseTimer.current)
    workshopCloseTimer.current = null
  }

  const openWorkshopDropdown = () => {
    cancelWorkshopClose()
    setWorkshopDropdownOpen(true)
  }

  /**
   * カーソルが外れてもすぐには閉じない。パネルが「ワークショップ」の文字よりずっと広いので、
   * 右の列へ斜めに動かすと、いったん文字の右へ出てからパネルに入る。その間に閉じないようにする。
   */
  const closeWorkshopDropdownSoon = () => {
    cancelWorkshopClose()
    workshopCloseTimer.current = setTimeout(() => setWorkshopDropdownOpen(false), 150)
  }

  useEffect(() => cancelWorkshopClose, [])

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
    // 開催予定の日程数。プルダウンの並び順（多い順）と「リクエスト受付中」の表示に使う。
    // 数え方はカテゴリページの「予約可能な日程」と同じ（予約0人締切は見ない）
    async function loadUpcomingCounts() {
      const { data } = await supabase
        .from('workshops')
        .select('category_id, sessions:workshop_sessions(event_date, event_time, status)')
        .eq('is_service', false)
        .eq('is_private', false)
        .not('category_id', 'is', null)
        .gte('sessions.event_date', jstToday())
        .eq('sessions.status', 'scheduled')
      if (!data) return
      const now = Date.now()
      const counts = new Map<string, number>()
      for (const w of data) {
        const sessions = (w.sessions ?? []) as { event_date: string; event_time: string | null }[]
        const n = sessions.filter(s => sessionStartJst(s).getTime() > now).length
        counts.set(w.category_id as string, (counts.get(w.category_id as string) ?? 0) + n)
      }
      setUpcomingCounts(counts)
    }
    // 英語ページのヘッダーはカテゴリ（日本語）を出さないので読まない
    if (!isEnglish) {
      loadCategories()
      loadUpcomingCounts()
    }
  }, [isEnglish])

  useEffect(() => {
    if (isEnglish || !isWorkshopDetail) return
    let cancelled = false
    supabase
      .from('workshops')
      .select('id')
      .eq('show_on_english_site', true)
      .then(({ data }) => {
        if (!cancelled) setEnglishWorkshopIds(new Set((data ?? []).map((r) => r.id as string)))
      })
    return () => {
      cancelled = true
    }
  }, [isEnglish, isWorkshopDetail])

  /** 日本語 / English の切り替え。今いる言語を強調し、もう一方へのリンクにする。
   *  ⚠ display（inline-flex / hidden）は呼び出し側で渡す。ここで inline-flex を持つと hidden が効かない */
  const languageSwitch = (className: string) => (
    <Link
      href={switchHref}
      hrefLang={isEnglish ? 'ja' : 'en'}
      onClick={closeMenu}
      className={`items-center gap-1.5 rounded-full border border-purple-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-purple-400 hover:text-purple-600 transition-colors whitespace-nowrap ${className}`}
      aria-label={isEnglish ? '日本語のページへ' : 'English version'}
    >
      <Globe className="w-4 h-4 shrink-0" aria-hidden />
      <span className={isEnglish ? 'text-gray-500' : 'font-bold text-purple-700'}>日本語</span>
      <span className="text-gray-300" aria-hidden>/</span>
      <span className={isEnglish ? 'font-bold text-purple-700' : 'text-gray-500'}>English</span>
    </Link>
  )

  if (isEnglish) {
    return (
      <>
        <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50" lang="en">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 gap-3">
              <Link href="/en" className="flex items-center shrink-0" onClick={closeMenu}>
                <Image src="/logo.png" alt="3DLab" width={180} height={60} className="h-12 w-auto sm:h-14" sizes="168px" priority />
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                {EN_NAV.map((item) => (
                  <Link key={item.href} href={item.href} className={linkClass}>
                    {item.label}
                  </Link>
                ))}
                {languageSwitch('inline-flex')}
              </nav>
              <div className="flex md:hidden items-center gap-2">
                {languageSwitch('inline-flex')}
                <button
                  onClick={toggleMenu}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {isMenuOpen ? <X className="w-6 h-6 text-gray-700" /> : <Menu className="w-6 h-6 text-gray-700" />}
                </button>
              </div>
            </div>
          </div>
        </header>
        {isMenuOpen && (
          <>
            <div className="md:hidden fixed inset-x-0 top-16 bg-white border-t border-gray-200 shadow-lg z-50" lang="en">
              <nav className="px-4 py-4 space-y-1">
                <Link href="/en" className="block px-4 py-3 text-base text-gray-700 hover:bg-purple-50 rounded-lg font-medium" onClick={closeMenu}>
                  Home
                </Link>
                {EN_NAV.map((item) => (
                  <Link key={item.href} href={item.href} className="block px-4 py-3 text-base text-gray-700 hover:bg-purple-50 rounded-lg font-medium" onClick={closeMenu}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="md:hidden fixed inset-0 bg-black/20 z-40" onClick={closeMenu} style={{ top: '64px' }} />
          </>
        )}
      </>
    )
  }

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
                onMouseEnter={openWorkshopDropdown}
                onMouseLeave={closeWorkshopDropdownSoon}
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
                  // 1024px 幅での実測（2026-10-02）: パネルの右端は 789px。広げるときは 1024px 幅で確かめること
                  <div className="absolute left-0 top-full pt-2 w-[40rem]">
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                      {/* カテゴリが増えても画面の下にはみ出さないよう、一覧だけを縦スクロールにする */}
                      <div className="grid grid-cols-2 gap-1 p-2 max-h-[calc(100vh-11rem)] overflow-y-auto">
                        {sortedCategories.map((cat) => {
                          const { tag, title } = splitCategoryName(cat.name)
                          const isRequestOnly = upcomingCounts !== null && (upcomingCounts.get(cat.id) ?? 0) === 0
                          const imageUrl = cat.image_url?.trim() ?? ''
                          return (
                            <Link
                              key={cat.id}
                              href={`/workshops/category/${cat.slug}`}
                              // 名前は2行で切るので、切れた分は title で読めるようにする
                              title={cat.name}
                              className="group flex items-center gap-3 rounded-xl p-2 hover:bg-purple-50 transition-colors"
                              onClick={() => setWorkshopDropdownOpen(false)}
                            >
                              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-100 to-pink-100">
                                {imageUrl && isOptimizableImageUrl(imageUrl) ? (
                                  // 名前が隣にあるので、画像は飾り扱い（alt は空）
                                  <Image
                                    src={optimizeImageUrl(imageUrl, 75)}
                                    alt=""
                                    fill
                                    sizes="56px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center text-sm font-bold text-purple-600">
                                    3D
                                  </span>
                                )}
                              </span>
                              <span className="min-w-0">
                                {(tag || isRequestOnly) && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold">
                                    {tag && <span className="text-purple-600">{tag}</span>}
                                    {isRequestOnly && (
                                      <span className="rounded-full bg-amber-100 px-1.5 py-px font-medium text-amber-700">
                                        リクエスト受付中
                                      </span>
                                    )}
                                  </span>
                                )}
                                {/* ⚠ ここに block を足さない。line-clamp の display（-webkit-box）を上書きして、3行以上に伸びる */}
                                <span className="text-sm font-medium leading-snug text-gray-800 line-clamp-2 group-hover:text-purple-700 transition-colors">
                                  {title}
                                </span>
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                      <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-3">
                        <Link
                          href="/workshops/categories"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-purple-700 transition-colors"
                          onClick={() => setWorkshopDropdownOpen(false)}
                        >
                          <LayoutGrid className="w-4 h-4" aria-hidden />
                          カテゴリ一覧
                        </Link>
                        <Link
                          href="/workshops"
                          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-bold text-white hover:shadow-md transition-shadow"
                          onClick={() => setWorkshopDropdownOpen(false)}
                        >
                          すべてのワークショップを見る
                          <ArrowRight className="w-4 h-4" aria-hidden />
                        </Link>
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
                    onMouseEnter={() => {
                      // ワークショップのパネルは遅れて閉じるので、ここで閉じておく（2枚重なって出ないように）
                      cancelWorkshopClose()
                      setWorkshopDropdownOpen(false)
                      setOpenGroup(entry.label)
                    }}
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

              {/* 言語の切り替え。⚠ 横一列の余裕は100px前後なので、lg では「English」だけの小さい形にする */}
              <Link
                href={switchHref}
                hrefLang="en"
                className="xl:hidden inline-flex items-center gap-1 rounded-full border border-purple-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:border-purple-400 hover:text-purple-600 transition-colors"
                aria-label="English version"
              >
                <Globe className="w-4 h-4 shrink-0" aria-hidden />
                EN
              </Link>
              {languageSwitch('hidden xl:inline-flex')}

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
              <CartLink />
            </nav>

            {/* Mobile: 言語の切り替えはメニューを開かなくても押せるように外に出す */}
            <div className="lg:hidden flex items-center gap-2">
            <Link
              href={switchHref}
              hrefLang="en"
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:border-purple-400 hover:text-purple-600 transition-colors"
              aria-label="English version"
            >
              <Globe className="w-4 h-4 shrink-0" aria-hidden />
              English
            </Link>
            <CartLink />
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
                {sortedCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/workshops/category/${cat.slug}`}
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                    onClick={closeMenu}
                  >
                    {cat.name}
                    {upcomingCounts !== null && (upcomingCounts.get(cat.id) ?? 0) === 0 && (
                      <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-px text-xs font-medium text-amber-700">
                        リクエスト受付中
                      </span>
                    )}
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
