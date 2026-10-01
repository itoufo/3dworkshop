import { Mail } from 'lucide-react'

export default function BusinessContactCta() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
          お気軽にご相談ください
        </h2>
        <p className="text-gray-600 text-center mb-8">
          イベントの規模や内容、ご予算に応じて最適なプランをご提案いたします。
          まずはお気軽にお問い合わせください。
        </p>

        <div className="max-w-md mx-auto">
          <a
            href="mailto:3dlab@sunu25.com"
            className="flex items-center justify-center p-6 bg-pink-50 rounded-2xl hover:bg-pink-100 transition-colors"
          >
            <Mail className="w-6 h-6 text-pink-600 mr-3" />
            <div>
              <p className="text-sm text-gray-500">メール</p>
              <p className="text-lg font-bold text-pink-700">3dlab@sunu25.com</p>
            </div>
          </a>
        </div>
      </div>
    </section>
  )
}
