import Link from 'next/link'
import PushSubscribeButton from './PushSubscribeButton'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">3D</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">3Dプリンター教室・体験イベント 3DLab</h3>
          <p className="text-sm text-gray-400">
            東京・秋葉原エリア（文京区湯島3-14-8 加田湯島ビル 5F）
          </p>
          <p className="text-sm text-gray-400">
            湯島駅・御徒町駅・秋葉原駅・御茶ノ水駅 からアクセス可能
          </p>
        </div>

        {/* 開催日程の通知 */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <PushSubscribeButton />
        </div>

        {/* Contact Information */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="text-center space-y-2">
            <p className="text-sm">
              <span className="text-gray-400">お問い合わせ：</span>
              <a href="mailto:3dlab@sunu25.com" className="text-purple-400 hover:text-purple-300 ml-2">
                3dlab@sunu25.com
              </a>
            </p>
            <p className="text-sm">
              <span className="text-gray-400">電話：</span>
              <a href="tel:080-9453-0911" className="text-purple-400 hover:text-purple-300 ml-2">
                080-9453-0911
              </a>
              <span className="text-gray-500 text-xs ml-2">※「3DLabを見た」とお伝えください</span>
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/workshops" className="text-gray-400 hover:text-purple-400 transition-colors">
              ワークショップ
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/products" className="text-gray-400 hover:text-purple-400 transition-colors">
              3Dプリント制作
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/team" className="text-gray-400 hover:text-purple-400 transition-colors">
              スタッフ紹介
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/faq" className="text-gray-400 hover:text-purple-400 transition-colors">
              よくある質問
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors">
              利用規約
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/privacy" className="text-gray-400 hover:text-purple-400 transition-colors">
              プライバシーポリシー
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/tokushoho" className="text-gray-400 hover:text-purple-400 transition-colors">
              特定商取引法に基づく表記
            </Link>
          </div>
        </div>

        {/* 運営会社 */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-2">運営会社</p>
            <div className="flex justify-center items-center space-x-4 flex-wrap">
              <a href="https://sunu25.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                株式会社sunU
              </a>
              <span className="text-gray-600">|</span>
              <a href="https://walker.co.jp" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">
                株式会社ウォーカー
              </a>
            </div>
          </div>
        </div>

        {/* SNS */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="flex justify-center">
            <a
              href="https://www.instagram.com/ai_3dprinter/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-pink-400 transition-colors text-sm"
            >
              Instagram @ai_3dprinter
            </a>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">© 2024 株式会社sunU. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
