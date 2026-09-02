import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle, Download, Clock } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { DOWNLOAD_VALID_DAYS } from '@/lib/cookie-cutter/pricing'

export const metadata: Metadata = {
  title: 'ご購入ありがとうございます',
  robots: { index: false, follow: false },
}

// 決済直後の状態を出すため、その都度サーバーで読む
export const dynamic = 'force-dynamic'

export default async function CutterSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const { order_id: orderId } = await searchParams

  let kind: 'download' | 'print' | null = null
  let token: string | null = null

  // 注文番号は推測できないUUID。決済を終えた本人だけが持っている前提で、
  // メールを待たずにここからダウンロードできるようにする
  if (orderId && supabaseAdmin) {
    const { data } = await supabaseAdmin
      .from('cutter_orders')
      .select('kind, payment_status, download_token')
      .eq('id', orderId)
      .single()
    if (data && data.payment_status === 'paid') {
      kind = data.kind
      token = data.download_token
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">ご購入ありがとうございます</h1>
          <p className="text-base text-gray-700 mb-8">
            お支払いが完了しました。ご入力いただいたメールアドレスに確認メールをお送りしています。
          </p>

          {kind === 'download' && token && (
            <div className="bg-white border border-purple-200 rounded-2xl p-6 mb-8">
              <a
                href={`/api/cookie-cutter/download/${token}`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-full hover:shadow-lg transition-all"
              >
                <Download className="w-5 h-5" />
                STLファイルをダウンロード
              </a>
              <p className="text-base text-gray-600 mt-4">
                同じリンクをメールでもお送りしました。{DOWNLOAD_VALID_DAYS}日間ダウンロードできます。
              </p>
              <p className="text-sm text-gray-500 mt-2">
                ふちを下にして置くと、サポート材なしで印刷できます。ノズル0.4mm・積層0.2mm を想定しています。
              </p>
            </div>
          )}

          {kind === 'download' && !token && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left flex gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-base text-amber-800">
                データを準備しています。数分ほどでダウンロードリンクをメールでお送りします。
                このページを再読み込みしてもご確認いただけます。
              </p>
            </div>
          )}

          {kind === 'print' && (
            <div className="bg-white border border-purple-200 rounded-2xl p-6 mb-8">
              <p className="text-base text-gray-700">{SHIPPING_LEAD_TIME_TEXT}いたします。</p>
              <p className="text-sm text-gray-500 mt-2">発送時にあらためてご連絡します。</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/cookie-cutter"
              className="inline-block px-8 py-4 bg-white text-gray-700 font-medium rounded-full border-2 border-gray-200 hover:border-purple-500 transition-all"
            >
              もうひとつ作る
            </Link>
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-white text-gray-700 font-medium rounded-full border-2 border-gray-200 hover:border-purple-500 transition-all"
            >
              トップページへ
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
