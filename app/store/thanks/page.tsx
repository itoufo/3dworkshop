import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_DOWNLOAD_VALID_DAYS } from '@/lib/store/orders'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'

export const metadata: Metadata = {
  title: 'ご購入ありがとうございます',
  robots: { index: false },
}

interface Props {
  searchParams: Promise<{ order?: string }>
}

/**
 * 決済のあとに戻ってくるページ。
 * ⚠ ここでダウンロードのリンクは出さない。URL の注文番号だけで開けてしまうので、
 *   リンクは購入時のメールアドレスにだけ送る。
 */
export default async function StoreThanksPage({ searchParams }: Props) {
  const { order: orderId } = await searchParams
  let kind: 'data' | 'print' | null = null
  if (supabaseAdmin && orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
    const { data } = await supabaseAdmin.from('store_orders').select('kind').eq('id', orderId).maybeSingle()
    kind = (data?.kind as 'data' | 'print' | undefined) ?? null
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900">ご購入ありがとうございます</h1>
      <p className="mt-5 text-base text-gray-700">
        {kind === 'print'
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
