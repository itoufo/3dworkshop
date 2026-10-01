import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_URL } from '@/lib/store/urls'

/**
 * ストアの注文の状態を進める。requireAdmin() 必須。
 *   ship   … 印刷の注文を発送済みにする（paid → shipped、追跡番号は任意）
 *   link   … データ購入のダウンロード用リンクをもう一度見る（メールが届かなかった人に渡す。状態は変えない）
 *   refund … 返金済みにする（paid / shipped → refunded）。データのダウンロードもここで止まる。
 *            ⚠ お金の返金そのものは Stripe の管理画面で行う。ここは記録だけ
 * ⚠ 今の状態を条件にして更新する。二重押しや別タブでの操作で状態が飛ばないように。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { action?: unknown; tracking_number?: unknown }
  const now = new Date().toISOString()

  if (body.action === 'link') {
    const { data: order } = await supabaseAdmin!
      .from('store_orders')
      .select('kind, status, download_token')
      .eq('id', id)
      .maybeSingle()
    if (!order || order.kind !== 'data' || order.status !== 'paid' || !order.download_token) {
      return NextResponse.json({ error: '支払い済みのデータ購入ではありません' }, { status: 409 })
    }
    return NextResponse.json({ url: `${STORE_URL}/api/store/download/${order.download_token}` })
  }

  let update: Record<string, unknown>
  let from: string[]
  if (body.action === 'ship') {
    const tracking = typeof body.tracking_number === 'string' ? body.tracking_number.trim().slice(0, 100) : ''
    update = { status: 'shipped', shipped_at: now, tracking_number: tracking || null, updated_at: now }
    from = ['paid']
  } else if (body.action === 'refund') {
    update = { status: 'refunded', refunded_at: now, updated_at: now }
    from = ['paid', 'shipped']
  } else {
    return NextResponse.json({ error: '操作が正しくありません' }, { status: 400 })
  }

  let query = supabaseAdmin!.from('store_orders').update(update).eq('id', id).in('status', from)
  // 発送は印刷の注文だけ
  if (body.action === 'ship') query = query.eq('kind', 'print')
  const { data, error } = await query.select('id')
  if (error) {
    console.error('[admin/store/orders] update failed:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'この注文はその状態に変えられません（画面を読み込み直してください）' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
