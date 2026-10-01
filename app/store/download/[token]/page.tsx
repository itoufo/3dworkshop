import type { Metadata } from 'next'
import { Download } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_DOWNLOAD_MAX_COUNT } from '@/lib/store/orders'

export const metadata: Metadata = {
  title: 'データのダウンロード',
  robots: { index: false, follow: false },
}

interface Props {
  params: Promise<{ token: string }>
}

/**
 * 購入メールのリンクの行き先。ここではまだ数えない。ボタン（POST）を押したときだけ数えてファイルを渡す。
 * ⚠ メールの安全確認やプレビューがリンクを開いても、ダウンロード回数が減らないようにするため。
 */
export default async function StoreDownloadPage({ params }: Props) {
  const { token } = await params
  let info: { title: string; status: string; remaining: number; expired: boolean } | null = null
  if (supabaseAdmin && /^[A-Za-z0-9_-]{40,}$/.test(token)) {
    const { data } = await supabaseAdmin
      .from('store_orders')
      .select('kind, status, download_count, download_expires_at, product:store_products(title)')
      .eq('download_token', token)
      .maybeSingle()
    if (data && data.kind === 'data') {
      const product = (Array.isArray(data.product) ? data.product[0] : data.product) as { title: string } | null
      info = {
        title: product?.title ?? '作品',
        status: data.status,
        remaining: Math.max(0, STORE_DOWNLOAD_MAX_COUNT - data.download_count),
        expired: !data.download_expires_at || new Date(data.download_expires_at) < new Date(),
      }
    }
  }

  const unavailable = !info
    ? 'リンクが正しくありません。'
    : info.status !== 'paid'
      ? 'このご注文はダウンロードできません。'
      : info.expired
        ? 'ダウンロード期限が過ぎています。'
        : info.remaining === 0
          ? 'ダウンロード回数の上限に達しました。'
          : null

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">データのダウンロード</h1>
      {info && <p className="mt-4 text-xl text-gray-800">{info.title}</p>}
      {unavailable ? (
        <p className="mt-6 text-base text-red-600">
          {unavailable} お手数ですが 3dlab@sunu25.com までお問い合わせください。
        </p>
      ) : (
        <form method="post" action={`/api/store/download/${encodeURIComponent(token)}`} className="mt-8">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold"
          >
            <Download className="w-5 h-5" />
            ダウンロードする
          </button>
          <p className="mt-4 text-base text-gray-600">あと {info!.remaining} 回ダウンロードできます。</p>
        </form>
      )}
    </div>
  )
}
