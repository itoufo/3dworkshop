import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_DOWNLOAD_VALID_DAYS } from '@/lib/store/orders'
import { SHIPPING_LEAD_TIME_DAYS, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import SettleStoreCart from '@/components/store/SettleStoreCart'
import { storePath, type StoreLocale } from '@/lib/store/locale'
import { STORE_UI, shippingLeadTimeText } from '@/lib/store/ui-copy'

/**
 * 決済のあとに戻ってくるページの中身（日本語 /thanks と英語 /en/thanks で共通）。
 * ⚠ ここでダウンロードのリンクは出さない。URL の注文番号だけで開けてしまうので、
 *   リンクは購入時のメールアドレスにだけ送る。
 */
export default async function StoreThanksView({
  locale,
  checkoutId,
  orderId,
}: {
  locale: StoreLocale
  /** checkout … カート（いまの決済）。order … カート導入前の1点決済 */
  checkoutId?: string
  orderId?: string
}) {
  const t = STORE_UI[locale].thanks
  const leadTime = shippingLeadTimeText(locale, SHIPPING_LEAD_TIME_TEXT, SHIPPING_LEAD_TIME_DAYS)
  // 文言を選ぶためだけに、この決済にデータ・完成品のどちらが入っているかを読む
  let kinds = new Set<string>()
  const UUID = /^[0-9a-f-]{36}$/i
  if (supabaseAdmin && ((checkoutId && UUID.test(checkoutId)) || (orderId && UUID.test(orderId)))) {
    const query = supabaseAdmin.from('store_orders').select('kind').in('status', ['pending', 'paid', 'shipped'])
    const { data } = await (checkoutId ? query.eq('checkout_id', checkoutId) : query.eq('id', orderId!))
    kinds = new Set((data ?? []).map((r) => r.kind as string))
  }
  const kind: 'data' | 'print' | 'both' | null =
    kinds.has('data') && kinds.has('print') ? 'both' : kinds.has('print') ? 'print' : kinds.has('data') ? 'data' : null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <SettleStoreCart />
      <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
      <h1 className="mt-6 text-3xl md:text-4xl font-bold text-gray-900">{t.title}</h1>
      <p className="mt-5 text-base text-gray-700">
        {kind === 'both'
          ? t.both(leadTime)
          : kind === 'print'
            ? t.print(leadTime)
            : kind === 'data'
              ? t.data(STORE_DOWNLOAD_VALID_DAYS)
              : t.notFound}
      </p>
      <p className="mt-3 text-base text-gray-600">{t.noMail}</p>
      <Link
        href={storePath(locale, '/')}
        className="mt-8 inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold"
      >
        {t.backToTop}
      </Link>
    </div>
  )
}
