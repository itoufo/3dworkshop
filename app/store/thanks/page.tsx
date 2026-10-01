import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_DOWNLOAD_VALID_DAYS } from '@/lib/store/orders'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import SettleStoreCart from '@/components/store/SettleStoreCart'

export const metadata: Metadata = {
  title: 'ご購入ありがとうございます',
  robots: { index: false },
}

interface Props {
  /** checkout … カート（いまの決済）。order … カート導入前の1点決済 */
  searchParams: Promise<{ checkout?: string; order?: string }>
}

/**
 * 決済のあとに戻ってくるページ。
 * ⚠ ここでダウンロードのリンクは出さない。URL の注文番号だけで開けてしまうので、
 *   リンクは購入時のメールアドレスにだけ送る。
 */
export default async function StoreThanksPage({ searchParams }: Props) {
  const { checkout: checkoutId, order: orderId } = await searchParams
  // 文言を選ぶためだけに、この決済にデータ・完成品のどちらが入っているかを読む
  let kinds = new Set<string>()
  const UUID = /^[0-9a-f-]{36}$/i
  if (supabaseAdmin && ((checkoutId && UUID.test(checkoutId)) || (orderId && UUID.test(orderId)))) {
    const query = supabaseAdmin.from('store_orders').select('kind')
    const { data } = await (checkoutId ? query.eq('checkout_id', checkoutId) : query.eq('id', orderId!))
    kinds = new Set((data ?? []).map((r) => r.kind as string))
  }
  const kind: 'data' | 'print' | 'both' | null =
    kinds.has('data') && kinds.has('print') ? 'both' : kinds.has('print') ? 'print' : kinds.has('data') ? 'data' : null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <SettleStoreCart />
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900">ご購入ありがとうございます</h1>
      <p className="mt-5 text-base text-gray-700">
        {kind === 'both'
          ? `ご注文を承りました。データのダウンロード用リンクと確認のメールを、ご入力のメールアドレスにまもなくお送りします。完成品は 3DLab が印刷して、${SHIPPING_LEAD_TIME_TEXT}します。`
          : kind === 'print'
          ? `ご注文を承りました。3DLab が印刷して、${SHIPPING_LEAD_TIME_TEXT}します。確認のメールをまもなくお送りします。`
          : kind === 'data'
            ? `ご入力のメールアドレスに、データのダウンロード用リンクをまもなくお送りします（${STORE_DOWNLOAD_VALID_DAYS}日間有効）。`
            : 'ご入力のメールアドレスに、確認のメールをまもなくお送りします。'}
      </p>
      <p className="mt-3 text-base text-gray-600">
        数分たってもメールが届かない場合は、迷惑メールフォルダをご確認のうえ、3dlab@sunu25.com までお問い合わせください。
      </p>
      <Link
        href="/"
        className="mt-8 inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold"
      >
        ストアのトップへ
      </Link>
    </div>
  )
}
