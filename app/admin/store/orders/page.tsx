'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/store/admin-fetch'

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled' | 'refunded'

type Order = {
  id: string
  kind: 'data' | 'print'
  price: number
  platform_fee: number
  seller_amount: number
  buyer_name: string | null
  buyer_email: string | null
  shipping: {
    name: string | null
    phone: string | null
    address: { postal_code?: string; state?: string; city?: string; line1?: string; line2?: string } | null
  } | null
  status: OrderStatus
  stripe_payment_intent_id: string | null
  download_count: number
  download_expires_at: string | null
  tracking_number: string | null
  paid_at: string | null
  shipped_at: string | null
  created_at: string
  product: { id: string; title: string; data_file_name: string | null } | null
  seller: { id: string; display_name: string } | null
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: '決済待ち',
  paid: '支払い済み',
  shipped: '発送済み',
  cancelled: 'キャンセル',
  refunded: '返金済み',
}
const FILTERS: (OrderStatus | 'all')[] = ['paid', 'shipped', 'refunded', 'all']
const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`
const date = (s: string | null) => (s ? new Date(s).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '—')

export default function AdminStoreOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('paid')
  const [tracking, setTracking] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const q = filter === 'all' ? '' : `?status=${filter}`
    const { ok, body } = await adminFetch<{ orders: Order[] }>(`/api/admin/store/orders${q}`)
    if (ok) {
      setOrders(body.orders ?? [])
      setError(null)
    } else setError(body.error || '取得に失敗しました')
    setLoading(false)
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  async function act(o: Order, action: 'ship' | 'refund') {
    const { ok, body } = await adminFetch(`/api/admin/store/orders/${o.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, tracking_number: tracking[o.id] ?? '' }),
    })
    if (!ok) {
      setError(body.error || '更新に失敗しました')
      return
    }
    setError(null)
    await load()
  }

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">ストア: 注文</h1>
      <p className="mt-2 text-gray-600">
        完成品の注文は、データを取り出して印刷・発送したら「発送済みにする」を押してください。
        返金は Stripe の管理画面で行い、そのあと「返金済みにする」を押します（データのダウンロードもそこで止まります）。
      </p>
      <div className="mt-4 flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm ${filter === f ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {f === 'all' ? 'すべて（決済待ちを除く）' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {loading ? (
        <p className="mt-6 text-gray-600">読み込み中…</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-gray-600">該当する注文はありません。</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => {
            const a = o.shipping?.address
            return (
              <li key={o.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-sm">{STATUS_LABEL[o.status]}</span>
                  <span className={`px-2 py-0.5 rounded text-sm ${o.kind === 'print' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                    {o.kind === 'print' ? '完成品' : 'データ'}
                  </span>
                  <span className="font-bold text-lg">{o.product?.title ?? '（削除された作品）'}</span>
                  <span className="text-gray-600 text-sm">出品者 {o.seller?.display_name}</span>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-800">
                  <p>注文番号 {o.id.slice(0, 8)} ／ 支払い {date(o.paid_at)}</p>
                  <p>
                    {yen(o.price)}（手数料 {yen(o.platform_fee)} ／ 出品者 {yen(o.seller_amount)}）
                  </p>
                  <p>
                    購入者 {o.buyer_name}（{o.buyer_email}）
                  </p>
                  {o.kind === 'data' && (
                    <p>
                      ダウンロード {o.download_count} 回 ／ 期限 {date(o.download_expires_at)}
                    </p>
                  )}
                  {o.stripe_payment_intent_id && (
                    <p>
                      <a
                        href={`https://dashboard.stripe.com/payments/${o.stripe_payment_intent_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-700 underline"
                      >
                        Stripe で開く
                      </a>
                    </p>
                  )}
                </div>
                {o.kind === 'print' && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                    <p className="font-medium">お届け先</p>
                    {a ? (
                      <p>
                        {o.shipping?.name}
                        <br />〒{a.postal_code} {a.state}
                        {a.city}
                        {a.line1} {a.line2}
                        {o.shipping?.phone && (
                          <>
                            <br />
                            電話 {o.shipping.phone}
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-red-700">住所が記録されていません</p>
                    )}
                    {o.product && (
                      <a href={`/api/admin/store/products/${o.product.id}/file`} className="mt-2 inline-block text-purple-700 underline">
                        印刷用のデータを取り出す（{o.product.data_file_name || 'ファイル'}）
                      </a>
                    )}
                    {o.status === 'shipped' && (
                      <p className="mt-2">
                        発送 {date(o.shipped_at)}
                        {o.tracking_number && ` ／ 追跡番号 ${o.tracking_number}`}
                      </p>
                    )}
                  </div>
                )}
                {(o.status === 'paid' || o.status === 'shipped') && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {o.kind === 'print' && o.status === 'paid' && (
                      <>
                        <input
                          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                          placeholder="追跡番号（任意）"
                          value={tracking[o.id] ?? ''}
                          onChange={(e) => {
                            const value = e.target.value
                            setTracking((prev) => ({ ...prev, [o.id]: value }))
                          }}
                        />
                        <button onClick={() => act(o, 'ship')} className="px-4 py-2 rounded bg-green-600 text-white text-sm">
                          発送済みにする
                        </button>
                      </>
                    )}
                    <button onClick={() => act(o, 'refund')} className="px-4 py-2 rounded bg-gray-600 text-white text-sm">
                      返金済みにする
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
