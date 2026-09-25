import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifySellerReviewed } from '@/lib/store/notify'

/**
 * 出品者の承認・却下・停止・停止解除。PATCH { status, review_note }
 * 結果は出品者のログインのメール（MiraiID で確認済みのもの）に送る。
 * 停止（suspended）は問題があったときに使うので、掲載中・審査中の作品も取り下げ（archived）にする。
 * 停止を解除（approved に戻す）しても作品は戻さない。出品者が見直して審査に出し直す。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NEXT_STATUS = ['approved', 'rejected', 'suspended'] as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const status = body?.status
  const note = typeof body?.review_note === 'string' ? body.review_note.trim().slice(0, 2000) || null : null
  if (!(NEXT_STATUS as readonly string[]).includes(status)) {
    return NextResponse.json({ error: 'status が不正です' }, { status: 400 })
  }

  const { data: seller, error } = await supabaseAdmin!
    .from('store_sellers')
    .update({ status, review_note: note, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, display_name, login_email')
    .maybeSingle()
  if (error || !seller) {
    console.error('[admin/store/sellers] update failed:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: error ? 500 : 404 })
  }

  if (status === 'suspended') {
    await supabaseAdmin!
      .from('store_products')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('seller_id', id)
      .in('status', ['published', 'pending_review'])
  }

  if (seller.login_email && status !== 'suspended') {
    await notifySellerReviewed({
      to: seller.login_email,
      kind: 'seller',
      approved: status === 'approved',
      name: seller.display_name,
      note,
    })
  }

  return NextResponse.json({ ok: true })
}
