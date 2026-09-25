import Link from 'next/link'

const ITEMS = [
  { href: '/sell', label: 'ダッシュボード', key: 'home' },
  { href: '/sell/products', label: '作品', key: 'products' },
  { href: '/sell/profile', label: 'プロフィール', key: 'profile' },
] as const

/** セラー管理画面の見出しとタブ */
export default function SellNav({ current, title }: { current: (typeof ITEMS)[number]['key']; title: string }) {
  return (
    <div className="mb-8">
      <p className="text-base text-purple-700 font-bold">出品者メニュー</p>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-1">{title}</h1>
      <nav className="mt-6 flex gap-2 border-b border-gray-200 overflow-x-auto">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`px-4 py-2 text-base whitespace-nowrap border-b-2 -mb-px ${
              item.key === current
                ? 'border-purple-600 text-purple-700 font-bold'
                : 'border-transparent text-gray-600 hover:text-purple-600'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
