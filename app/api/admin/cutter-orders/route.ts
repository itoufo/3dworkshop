import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * クッキー型の注文一覧と、発送済みへの切り替え。
 *
 * ⚠ 必ず requireAdmin() を通す。cutter_orders には配送先と
 *   ダウンロード用の合言葉が入っていて、漏れると誰でもデータを取れる。
 * ⚠ 公開ロール向けの RLS ポリシーは足さないこと。同じ理由。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await supabaseAdmin!
    .from('cutter_orders')
    .select(`
      id, kind, quantity, unit_price, shipping_fee, total_amount, notes,
      status, payment_status, shipping_name, shipping_phone, shipping_address,
      stl_path, download_count, download_expires_at, shipped_at, created_at,
      design:cutter_designs(id, title, size_mm, volume_cm3),
      customer:customers(name, email, phone)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('cutter orders list failed:', error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ orders: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id, status } = (await request.json()) as { id?: string; status?: string }
  if (!id || !status) {
    return NextResponse.json({ error: 'id と status が必要です' }, { status: 400 })
  }
  // 受け付ける状態を限定する。任意の文字列を入れられると集計が壊れる
  const allowed = ['paid', 'shipped', 'cancelled']
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: '不正な状態です' }, { status: 400 })
  }

  const { error } = await supabaseAdmin!
    .from('cutter_orders')
    .update({ status, shipped_at: status === 'shipped' ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) {
    console.error('cutter order update failed:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
