import Link from 'next/link'

/**
 * 英語ページ（/en）のフッター。
 * 規約・プライバシー等は日本語版しかないため、日本語ページへのリンクであることを明記する。
 */
export default function EnglishFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12" lang="en">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">3D</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">3DLab — AI × 3D printer workshops in Tokyo</h3>
          <p className="text-base text-gray-400">5F Kada Yushima Building, 3-14-8 Yushima, Bunkyo-ku, Tokyo 113-0034</p>
          <p className="text-base text-gray-400">1 minute on foot from Yushima Station (Tokyo Metro Chiyoda Line), Exit 3</p>
        </div>

        <div className="border-t border-gray-800 pt-6 mb-6 text-center">
          <p className="text-base">
            <span className="text-gray-400">Contact:</span>
            <a href="mailto:3dlab@sunu25.com" className="text-purple-400 hover:text-purple-300 ml-2">
              3dlab@sunu25.com
            </a>
          </p>
        </div>

        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-base">
            <Link href="/en/workshops" className="text-gray-400 hover:text-purple-400 transition-colors">
              Workshops
            </Link>
            <Link href="/en/faq" className="text-gray-400 hover:text-purple-400 transition-colors">
              FAQ
            </Link>
            <Link href="/terms" hrefLang="ja" className="text-gray-400 hover:text-purple-400 transition-colors">
              Terms of use (Japanese)
            </Link>
            <Link href="/privacy" hrefLang="ja" className="text-gray-400 hover:text-purple-400 transition-colors">
              Privacy policy (Japanese)
            </Link>
            <Link href="/tokushoho" hrefLang="ja" className="text-gray-400 hover:text-purple-400 transition-colors">
              Legal notice (Japanese)
            </Link>
            <Link href="/" hrefLang="ja" className="text-gray-400 hover:text-purple-400 transition-colors">
              日本語サイト
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 mb-6 text-center">
          <p className="text-base text-gray-400 mb-2">Operated by</p>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <a href="https://sunu25.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
              sunU Inc.
            </a>
            <span className="text-gray-600">|</span>
            <a href="https://walker.co.jp" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
              Walker Inc.
            </a>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 mb-6 flex justify-center">
          <a
            href="https://www.instagram.com/ai_3dprinter/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-pink-400 transition-colors text-base"
          >
            Instagram @ai_3dprinter
          </a>
        </div>

        <p className="text-center text-sm text-gray-500">© 2024 sunU Inc. All rights reserved.</p>
      </div>
    </footer>
  )
}
