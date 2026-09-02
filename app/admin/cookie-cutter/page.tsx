'use client'

import { useCallback, useEffect, useState } from 'react'
import AdminSidebar from '@/components/AdminSidebar'
import { Cookie, Download, Package, Check, RefreshCw } from 'lucide-react'

interface CutterOrder {
  id: string
  kind: 'download' | 'print'
  quantity: number
  unit_price: number
  shipping_fee: number
  total_amount: number
  notes: string | null
  status: string
  payment_status: string
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: Record<string, string> | null
  stl_path: string | null
  download_count: number
  shipped_at: string | null
  created_at: string
  design: { id: string; title: string | null; size_mm: { width: number; depth: number; height: number } | null; volume_cm3: number | null } | null
  customer: { name: string | null; email: string | null; phone: string | null } | null
}

function addressText(address: Record<string, string> | null): string {
  if (!address) return ''
  return [
    address.postal_code ? `〒${address.postal_code}` : '',
    `${address.state || ''}${address.city || ''}${address.line1 || ''}`,
    address.line2 || '',
  ]
    .filter(Boolean)
    .join(' ')
}

export default function AdminCookieCutterPage() {
  const [orders, setOrders] = useState<CutterOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/cutter-orders')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '取得に失敗しました')
        setOrders([])
      } else {
        setOrders(data.orders)
        setError(null)
      }
    } catch {
      setError('通信エラーが発生しました')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function markShipped(order: CutterOrder) {
    if (!confirm('発送済みにしますか？')) return
    const res = await fetch('/api/admin/cutter-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status: 'shipped' }),
    })
    if (!res.ok) {
      alert('更新に失敗しました')
      return
    }
    load()
  }

  // 印刷して発送する注文は手を動かす必要があるので上に出す
  const toPrint = orders.filter((o) => o.kind === 'print' && o.status === 'paid')
  const rest = orders.filter((o) => !(o.kind === 'print' && o.status === 'paid'))

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cookie className="w-6 h-6 text-purple-600" />
            クッキー型の注文
          </h1>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-base hover:bg-gray-100"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
        </div>

        {error && <p className="mb-4 text-base text-red-600">{error}</p>}
        {loading && <p className="text-base text-gray-500">読み込み中…</p>}

        {!loading && orders.length === 0 && !error && (
          <p className="text-base text-gray-500">まだ注文はありません。</p>
        )}

        {toPrint.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              印刷して発送する（{toPrint.length}件）
            </h2>
            <div className="space-y-4">
              {toPrint.map((order) => (
                <OrderCard key={order.id} order={order} onShip={() => markShipped(order)} highlight />
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">その他（{rest.length}件）</h2>
            <div className="space-y-4">
              {rest.map((order) => (
                <OrderCard key={order.id} order={order} onShip={() => markShipped(order)} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function OrderCard({
  order,
  onShip,
  highlight = false,
}: {
  order: CutterOrder
  onShip: () => void
  highlight?: boolean
}) {
  const size = order.design?.size_mm
  return (
    <div
      className={`bg-white rounded-xl border p-5 ${highlight ? 'border-purple-300 ring-1 ring-purple-100' : 'border-gray-200'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm font-medium ${
                order.kind === 'print' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {order.kind === 'print' ? <Package className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {order.kind === 'print' ? '印刷して発送' : 'データ'}
            </span>
            <span className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleString('ja-JP')}
            </span>
            <span className="text-sm text-gray-500">/ {order.status}</span>
            {order.shipped_at && (
              <span className="text-sm text-green-700">
                発送 {new Date(order.shipped_at).toLocaleDateString('ja-JP')}
              </span>
            )}
          </div>

          <p className="text-lg font-bold text-gray-900">
            {order.design?.title || '(名前なし)'}
          </p>
          <p className="text-base text-gray-700">
            {order.customer?.name || '—'}（{order.customer?.email || '—'}
            {order.customer?.phone ? ` / ${order.customer.phone}` : ''}）
          </p>
          <p className="text-base text-gray-600">
            {size ? `${size.width} × ${size.depth} × ${size.height} mm` : 'サイズ不明'}
            {order.design?.volume_cm3 ? ` / 約 ${order.design.volume_cm3} cm³` : ''}
            {order.kind === 'print' ? ` / ${order.quantity} 点` : ''}
            {` / ¥${order.total_amount.toLocaleString()}`}
            {order.kind === 'download' ? ` / DL ${order.download_count}回` : ''}
          </p>

          {order.kind === 'print' && (
            <p className="text-base text-gray-700 mt-1">
              お届け先: {order.shipping_name || '—'} {order.shipping_phone || ''}{' '}
              {addressText(order.shipping_address)}
            </p>
          )}
          {order.notes && (
            <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">ご要望: {order.notes}</p>
          )}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {order.stl_path ? (
            <a
              href={`/api/admin/cutter-orders/${order.id}/stl`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-base font-medium hover:bg-purple-700"
            >
              <Download className="w-4 h-4" />
              STLを取得
            </a>
          ) : (
            <span className="text-sm text-amber-700">STL未生成</span>
          )}

          {order.kind === 'print' && order.status === 'paid' && (
            <button
              onClick={onShip}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-base hover:bg-gray-100"
            >
              <Check className="w-4 h-4" />
              発送済みにする
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
