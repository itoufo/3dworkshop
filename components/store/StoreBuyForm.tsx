'use client'

import { useState } from 'react'
import { Download, Package, ShieldCheck } from 'lucide-react'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { STORE_DOWNLOAD_MAX_COUNT, STORE_DOWNLOAD_VALID_DAYS } from '@/lib/store/download-limits'

interface Props {
  productId: string
  dataPrice: number | null
  printPrice: number | null
  printSpec: string | null
  /** ログイン中なら最初から入れておく */
  defaultName: string
  defaultEmail: string
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

/**
 * 作品ページの購入ボックス。データ（ダウンロード）か完成品（3DLab が印刷して発送）を選んで決済へ。
 * 価格はここでは表示だけ。決済の金額は API が DB から決める。
 */
export default function StoreBuyForm({ productId, dataPrice, printPrice, printSpec, defaultName, defaultEmail }: Props) {
  const options = [
    ...(dataPrice != null ? [{ kind: 'data' as const, price: dataPrice }] : []),
    ...(printPrice != null ? [{ kind: 'print' as const, price: printPrice }] : []),
  ]
  const [kind, setKind] = useState<'data' | 'print'>(options[0]?.kind ?? 'data')
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/store/products/${productId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        setError(data.message || '決済の準備に失敗しました')
        setSubmitting(false)
        return
      }
      window.location.href = data.url
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
  }

  if (options.length === 0) return null
  const selected = options.find((o) => o.kind === kind) ?? options[0]
  const inputClass =
    'mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900'

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-base font-medium text-gray-900 mb-1">買い方を選ぶ</legend>
        {options.map((o) => (
          <label
            key={o.kind}
            className={`flex items-start gap-3 rounded-xl border-2 p-3 cursor-pointer ${
              kind === o.kind ? 'border-purple-600 bg-purple-50' : 'border-gray-200'
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={o.kind}
              checked={kind === o.kind}
              onChange={() => setKind(o.kind)}
              className="mt-1"
            />
            <span className="flex-1">
              <span className="flex items-center justify-between">
                <span className="flex items-center font-medium text-gray-900">
                  {o.kind === 'data' ? <Download className="w-4 h-4 mr-1.5" /> : <Package className="w-4 h-4 mr-1.5" />}
                  {o.kind === 'data' ? '3D データ' : '完成品（3DLab が印刷してお届け）'}
                </span>
                <span className="font-bold text-gray-900">{yen(o.price)}</span>
              </span>
              <span className="block text-sm text-gray-600 mt-0.5">
                {o.kind === 'data'
                  ? `お支払い後すぐにダウンロードできます（${STORE_DOWNLOAD_VALID_DAYS}日間・${STORE_DOWNLOAD_MAX_COUNT}回まで）。ご自分の3Dプリンターで印刷できます。`
                  : `${SHIPPING_LEAD_TIME_TEXT}・送料無料（全国一律）${printSpec ? `。${printSpec}` : ''}`}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <label className="block text-sm font-medium text-gray-700">
        お名前 <span className="text-red-500">*</span>
        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="name" />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        メールアドレス <span className="text-red-500">*</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <span className="block mt-1 text-sm font-normal text-gray-500">
          {kind === 'data' ? 'ダウンロードのリンクをこのアドレスにお送りします。' : 'ご注文の確認をこのアドレスにお送りします。'}
        </span>
      </label>

      {error && <p className="text-base text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition-colors disabled:opacity-60"
      >
        {submitting ? '決済画面へ移動しています...' : `${yen(selected.price)} で購入する`}
      </button>
      <p className="flex items-start text-sm text-gray-500">
        <ShieldCheck className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-purple-600" />
        お支払いは Stripe の安全な決済画面で。カード情報は当社に保存されません。
        {kind === 'print' && ' お届け先も決済画面でご入力いただきます。'}
      </p>
    </form>
  )
}
