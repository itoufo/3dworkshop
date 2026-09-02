import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Cookie, Download, Package, Calendar, CheckCircle } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import LogoutButton from '@/components/account/LogoutButton'
import { currentCustomer } from '@/lib/customer-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DOWNLOAD_MAX_COUNT } from '@/lib/cookie-cutter/pricing'

export const metadata: Metadata = {
  title: 'マイページ',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('ja-JP')
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ verified?: string }>
}) {
  const customer = await currentCustomer()
  if (!customer) redirect('/account/login')

  const { verified } = await searchParams

  // 会員本人の行だけを service-role で読む。
  // ⚠ customer.id は署名済みのセッションから来た値。クエリ文字列から受け取らないこと
  const [cutterResult, productResult, bookingResult] = await Promise.all([
    supabaseAdmin!
      .from('cutter_orders')
      .select('id, kind, quantity, total_amount, status, payment_status, download_token, download_count, download_expires_at, created_at, design:cutter_designs(title, size_mm)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin!
      .from('product_orders')
      .select('id, quantity, total_amount, status, payment_status, created_at, product:products(name)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin!
      .from('bookings')
      .select('id, booking_date, booking_time, participants, total_amount, status, payment_status, workshop:workshops(title)')
      .eq('customer_id', customer.id)
      .order('booking_date', { ascending: false })
      .limit(30),
  ])

  const cutterOrders = cutterResult.data ?? []
  const productOrders = productResult.data ?? []
  const bookings = bookingResult.data ?? []
  const nothing = cutterOrders.length === 0 && productOrders.length === 0 && bookings.length === 0

  const sectionClass = 'bg-white rounded-2xl border border-gray-200 p-6'

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50">
      <Header />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {verified === '1' && (
            <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-base text-green-800">
              <CheckCircle className="w-5 h-5 shrink-0" />
              メールアドレスの確認が完了しました。
            </p>
          )}

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">マイページ</h1>
              <p className="text-base text-gray-600 mt-1">
                {customer.name} 様（{customer.email}）
              </p>
            </div>
            <LogoutButton />
          </div>

          {nothing && (
            <section className={sectionClass}>
              <p className="text-base text-gray-700">
                まだご購入・ご予約の記録がありません。
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <Link
                  href="/cookie-cutter"
                  className="inline-block px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium"
                >
                  クッキー型を作る
                </Link>
                <Link
                  href="/workshops"
                  className="inline-block px-6 py-3 rounded-full border-2 border-gray-200 text-gray-700 font-medium hover:border-purple-500"
                >
                  ワークショップを見る
                </Link>
              </div>
            </section>
          )}

          {cutterOrders.length > 0 && (
            <section className={sectionClass}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Cookie className="w-5 h-5 text-purple-600" />
                クッキー型
              </h2>
              <ul className="space-y-4">
                {cutterOrders.map((order) => {
                  const design = Array.isArray(order.design) ? order.design[0] : order.design
                  const size = design?.size_mm as { width?: number; depth?: number } | null
                  const expired =
                    order.download_expires_at && new Date(order.download_expires_at) < new Date()
                  const usedUp = (order.download_count ?? 0) >= DOWNLOAD_MAX_COUNT
                  const canDownload =
                    order.kind === 'download' &&
                    order.payment_status === 'paid' &&
                    order.download_token &&
                    !expired &&
                    !usedUp

                  return (
                    <li key={order.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-bold text-gray-900">
                            {design?.title || '(名前なし)'}
                          </p>
                          <p className="text-base text-gray-600">
                            {order.kind === 'print' ? '印刷して発送' : 'データ（STL）'}
                            {size?.width ? ` / ${size.width}×${size.depth}mm` : ''}
                            {` / ¥${order.total_amount.toLocaleString()}`}
                            {` / ${formatDate(order.created_at)}`}
                          </p>
                          {order.kind === 'download' && order.payment_status === 'paid' && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {expired
                                ? 'ダウンロード期限が切れています'
                                : usedUp
                                  ? 'ダウンロード回数の上限に達しました'
                                  : `${formatDate(order.download_expires_at)} まで／あと ${DOWNLOAD_MAX_COUNT - (order.download_count ?? 0)} 回`}
                            </p>
                          )}
                          {order.kind === 'print' && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {order.status === 'shipped' ? '発送済み' : '準備中'}
                            </p>
                          )}
                        </div>

                        {canDownload && (
                          <a
                            href={`/api/cookie-cutter/download/${order.download_token}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-base font-medium hover:bg-purple-700"
                          >
                            <Download className="w-4 h-4" />
                            ダウンロード
                          </a>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                期限が切れた場合や上限に達した場合は、チャットの「担当者にメールで問い合わせる」からご連絡ください。
              </p>
            </section>
          )}

          {productOrders.length > 0 && (
            <section className={sectionClass}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                商品のご注文
              </h2>
              <ul className="space-y-3">
                {productOrders.map((order) => {
                  const product = Array.isArray(order.product) ? order.product[0] : order.product
                  return (
                    <li key={order.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-base text-gray-900">{product?.name || '(商品)'}</span>
                      <span className="text-base text-gray-600">
                        {order.quantity}点 / ¥{order.total_amount.toLocaleString()} /{' '}
                        {order.status === 'shipped' ? '発送済み' : '準備中'} / {formatDate(order.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {bookings.length > 0 && (
            <section className={sectionClass}>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                ワークショップのご予約
              </h2>
              <ul className="space-y-3">
                {bookings.map((booking) => {
                  const workshop = Array.isArray(booking.workshop) ? booking.workshop[0] : booking.workshop
                  return (
                    <li key={booking.id} className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <span className="text-base text-gray-900">{workshop?.title || '(ワークショップ)'}</span>
                      <span className="text-base text-gray-600">
                        {formatDate(booking.booking_date)} {booking.booking_time ?? ''} / {booking.participants}名 /{' '}
                        {booking.status === 'cancelled' ? 'キャンセル' : '予約済み'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
