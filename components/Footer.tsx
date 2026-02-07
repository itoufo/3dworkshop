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
          <h3 className="text-xl font-bold text-white mb-2">3Dプリンタ教室 3DLab</h3>
        </div>
        
        {/* Contact Information */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="text-center space-y-2">
            <p className="text-sm">
              <span className="text-gray-400">お問い合わせ：</span>
              <a href="mailto:y-sato@sunu25.com" className="text-purple-400 hover:text-purple-300 ml-2">
                y-sato@sunu25.com
              </a>
            </p>
            <p className="text-sm">
              <span className="text-gray-400">電話：</span>
              <a href="tel:080-9453-0911" className="text-purple-400 hover:text-purple-300 ml-2">
                080-9453-0911
              </a>
            </p>
          </div>
        </div>
        
        {/* Links */}
        <div className="border-t border-gray-800 pt-6 mb-6">
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="/workshops" className="text-gray-400 hover:text-purple-400 transition-colors">
              ワークショップ
            </a>
            <span className="text-gray-600">|</span>
            <a href="/products/3d-printing/new" className="text-gray-400 hover:text-purple-400 transition-colors">
              3Dプリント制作
            </a>
            <span className="text-gray-600">|</span>
            <a href="/terms" className="text-gray-400 hover:text-purple-400 transition-colors">
              利用規約
            </a>
            <span className="text-gray-600">|</span>
            <a href="/privacy" className="text-gray-400 hover:text-purple-400 transition-colors">
              プライバシーポリシー
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