'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Package, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react'
import {
  lineKey,
  rememberStoreCheckout,
  removeFromStoreCart,
  setStoreCartQuantity,
  useStoreCart,
  type StoreCartLine,
} from '@/lib/store/cart'
import { STORE_CART_MAX_QUANTITY } from '@/lib/store/cart-limits'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'

interface PreviewLine {
  key: string
  productId: string
  kind: 'data' | 'print'
  variantId: string | null
  variantLabel: string | null
  quantity: number
  unitPrice: number
  title: string
  imageUrl: string | null
  sellerName: string
  problem: string | null
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

/**
 * ストアのカートの画面（本サイトの CartClient と同じ2列: 左に中身、右に合計とお客さま情報）。
 * 表示用の価格は /api/store/cart/preview から読むが、決済の金額は決済 API が作品の値から決め直す。
 */
export default function StoreCartClient({ defaultName, defaultEmail }: { defaultName: string; defaultEmail: string }) {
  const { lines, ready } = useStoreCart()
  const [preview, setPreview] = useState<Record<string, PreviewLine>>({})
  /** どのカートの中身まで読み込み済みか。入れたばかりの明細を「販売していません」と見せないため */
  const [previewOf, setPreviewOf] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: defaultName, email: defaultEmail })
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [problemKey, setProblemKey] = useState<string | null>(null)

  const signature = useMemo(() => JSON.stringify(lines.map((l) => [lineKey(l), l.quantity])), [lines])
  useEffect(() => {
    if (!ready || lines.length === 0) return
    // ⚠ 古い問い合わせの返事が後から届いても使わない（別タブで中身が変わったときなど）
    let cancelled = false
    fetch('/api/store/cart/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: lines }),
    })
      .then((r) => r.json())
      .then((body: { lines?: PreviewLine[]; error?: string }) => {
        if (cancelled) return
        if (!body.lines) {
          setLoadError(body.error || '作品の情報を読み込めませんでした。ページを開き直してください。')
          return
        }
        setLoadError(null)
        setPreview(Object.fromEntries(body.lines.map((l) => [l.key, l])))
        setPreviewOf(signature)
      })
      .catch(() => {
        if (!cancelled) setLoadError('作品の情報を読み込めませんでした。ページを開き直してください。')
      })
    return () => {
      cancelled = true
    }
    // signature が中身の変化を表す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready])

  const rows = lines.map((line) => {
    const p = preview[lineKey(line)]
    const loading = !p || previewOf !== signature
    return { line, p, loading, blocked: !loading && Boolean(p?.problem) }
  })
  const anyLoading = rows.some((r) => r.loading)
  const blocked = rows.some((r) => r.blocked)
  const buyable = rows.filter((r) => !r.loading && !r.blocked)
  const total = buyable.reduce((sum, r) => sum + r.p!.unitPrice * r.line.quantity, 0)
  const itemCount = buyable.reduce((sum, r) => sum + r.line.quantity, 0)
  const hasPrint = buyable.some((r) => r.line.kind === 'print')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setProblemKey(null)
    setSubmitting(true)
    const submitted: StoreCartLine[] = buyable.map((r) => r.line)
    try {
      const res = await fetch('/api/store/cart/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items: submitted }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) {
        setErrorMsg(body.message || '決済の準備に失敗しました')
        if (body.key) setProblemKey(body.key)
        setSubmitting(false)
        return
      }
      // 決済が終わったら、送った分だけカートから引く（thanks ページで settle する）
      rememberStoreCheckout(body.checkoutId, submitted)
      window.location.href = body.url
    } catch {
      setErrorMsg('通信エラーが発生しました。時間をおいて再度お試しください。')
      setSubmitting(false)
    }
  }

  if (!ready) return <p className="text-base text-gray-600">読み込み中…</p>

  if (lines.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="w-14 h-14 mx-auto text-gray-300" />
        <h1 className="mt-4 text-3xl font-bold text-gray-900">カートは空です</h1>
        <Link href="/" className="mt-6 inline-block px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
          作品を見る
        </Link>
      </div>
    )
  }

  const inputClass =
    'mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900'

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">カート</h1>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
        <ul className="divide-y divide-gray-200 bg-white rounded-2xl border border-gray-200">
          {rows.map(({ line, p, loading, blocked: lineBlocked }) => {
            const key = lineKey(line)
            return (
              <li key={key} className={`flex gap-4 p-4 ${problemKey === key ? 'bg-red-50' : ''}`}>
                <Link href={`/p/${line.productId}`} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {p?.imageUrl ? (
                    <Image src={p.imageUrl} alt="" fill sizes="96px" className="object-cover" />
                  ) : (
                    <Package className="w-10 h-10 m-7 text-gray-300" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/p/${line.productId}`} className="text-base font-bold text-gray-900 hover:text-purple-700">
                    {loading ? '読み込み中…' : p?.title}
                  </Link>
                  {!loading && (
                    <p className="text-base text-gray-700">
                      {line.kind === 'data' ? '3D データ' : '完成品'}
                      {p?.variantLabel && ` ・ ${p.variantLabel}`}
                      {p?.sellerName && <span className="text-gray-500"> ／ {p.sellerName}</span>}
                    </p>
                  )}
                  {lineBlocked && <p className="text-base text-red-600">{p?.problem}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {line.kind === 'print' ? (
                      <label className="flex items-center gap-2 text-base text-gray-700">
                        数量
                        <select
                          value={line.quantity}
                          onChange={(e) => setStoreCartQuantity(key, parseInt(e.target.value) || 1)}
                          className="px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900"
                        >
                          {Array.from({ length: STORE_CART_MAX_QUANTITY }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="text-base text-gray-600">ダウンロード（1つ）</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFromStoreCart(key)}
                      className="inline-flex items-center text-base text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      削除
                    </button>
                  </div>
                </div>
                <p className="text-base font-bold text-gray-900 whitespace-nowrap">
                  {!loading && p && !lineBlocked ? yen(p.unitPrice * line.quantity) : ''}
                </p>
              </li>
            )
          })}
        </ul>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 lg:sticky lg:top-6">
          <p className="text-base text-gray-700">
            小計（{itemCount} 点）
            <span className="block text-3xl font-bold text-gray-900">{yen(total)}</span>
            <span className="text-sm text-gray-500">税込・送料無料</span>
          </p>
          {hasPrint && <p className="text-sm text-gray-600">完成品は{SHIPPING_LEAD_TIME_TEXT}します。</p>}
          <label className="block text-sm font-medium text-gray-700">
            お名前 <span className="text-red-500">*</span>
            <input type="text" required maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} autoComplete="name" />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            メールアドレス <span className="text-red-500">*</span>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="you@example.com" autoComplete="email" />
            <span className="block mt-1 text-sm font-normal text-gray-500">
              ご注文の確認{buyable.some((r) => r.line.kind === 'data') && 'とデータのダウンロード用リンク'}をこのアドレスにお送りします。
            </span>
          </label>
          {loadError && <p className="text-base text-red-600">{loadError}</p>}
          {blocked && <p className="text-base text-red-600">買えない作品がカートに入っています。カートから外してください。</p>}
          {errorMsg && <p className="text-base text-red-600">{errorMsg}</p>}
          <button
            type="submit"
            disabled={submitting || anyLoading || blocked || buyable.length === 0 || Boolean(loadError)}
            className="w-full py-3 rounded-full bg-amber-400 hover:bg-amber-500 text-gray-900 font-semibold transition-colors disabled:opacity-60"
          >
            {submitting ? '決済画面へ移動しています...' : 'レジに進む'}
          </button>
          <p className="flex items-start text-sm text-gray-500">
            <ShieldCheck className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-purple-600" />
            お支払いは Stripe の安全な決済画面で。カード情報は当社に保存されません。
            {hasPrint && ' お届け先も決済画面でご入力いただきます。'}
          </p>
        </form>
      </div>
    </div>
  )
}
