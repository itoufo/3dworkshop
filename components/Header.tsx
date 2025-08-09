import Link from 'next/link'

export default function Header() {
  return (
    <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">3D</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Workshop
            </span>
          </Link>
          
          <nav className="flex items-center space-x-6">
            {/* <Link
              href="/school"
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 animate-pulse"
            >
              3Dスクール
            </Link> */}
            <Link
              href="/"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              ワークショップ
            </Link>
            <Link
              href="/products"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              商品・サービス
            </Link>
            <Link
              href="/portfolio"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              実績紹介
            </Link>
            <Link
              href="/blog"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              ブログ
            </Link>
            <Link
              href="/admin"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              会員メニュー
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}