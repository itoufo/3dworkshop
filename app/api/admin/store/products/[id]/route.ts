import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifySellerReviewed } from '@/lib/store/notify'

/**
 * 作品の審査。PATCH { action: 'approve' | 'reject' | 'unpublish', review_note }
 *   approve   … 審査中 → 掲載中（出品者が承認済みのときだけ）
 *   reject    … 審査中 → 差し戻し（理由を出品者に送る）
 *   unpublish … 掲載中 → 差し戻し（掲載後に問題が分かったとき）
 * ⚠ 状態の条件つきで更新する。出品者が同時に内容を差し替えた場合に、
 *   見ていない内容を承認しないため（更新できなければ 409）。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin()
  if (denied) return denied

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const action = body?.action
  const note = typeof body?.review_note === 'string' ? body.review_note.trim().slice(0, 2000) || null : null
  // 画面で見ていた版。これより後に出品者が保存していたら承認しない
  const seenUpdatedAt = typeof body?.updated_at === 'string' ? body.updated_at : null
  const now = new Date().toISOString()

  const { data: product } = await supabaseAdmin!
    .from('store_products')
    .select('id, title, status, updated_at, seller:store_sellers(id, status, identity:store_identities(email))')
    .eq('id', id)
    .maybeSingle()
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const seller = product.seller as unknown as {
    id: string
    status: string
    identity: { email: string } | null
  } | null

  let from: string
  let update: Record<string, unknown>
  if (action === 'approve') {
    // ⚠ 見ていた版が必須。無しで承認すると、出品者が直前に差し替えた内容を見ずに掲載してしまう
    if (!seenUpdatedAt) return NextResponse.json({ error: '画面を読み込み直してください' }, { status: 400 })
    if (seller?.status !== 'approved') {
      return NextResponse.json({ error: '出品者が承認されていません' }, { status: 409 })
    }
    from = 'pending_review'
    update = { status: 'published', published_at: now, review_note: null }
  } else if (action === 'reject') {
    if (!note) return NextResponse.json({ error: '差し戻しの理由を書いてください' }, { status: 400 })
    from = 'pending_review'
    update = { status: 'rejected', review_note: note }
  } else if (action === 'unpublish') {
    if (!note) return NextResponse.json({ error: '理由を書いてください' }, { status: 400 })
    from = 'published'
    update = { status: 'rejected', review_note: note }
  } else {
    return NextResponse.json({ error: 'action が不正です' }, { status: 400 })
  }

  let query = supabaseAdmin!
    .from('store_products')
    .update({ ...update, updated_at: now })
    .eq('id', id)
    .eq('status', from)
  if (seenUpdatedAt) query = query.eq('updated_at', seenUpdatedAt)
  const { data: updated, error } = await query.select('id')
  if (error) {
    console.error('[admin/store/products] update failed:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: '出品者が内容を変えたか、状態が変わっています。一覧を読み込み直してください' }, { status: 409 })
  }

  // ⚠ 承認と同時に出品者が停止された場合、掲載中のまま残らないよう、承認後に出品者の状態を見直す。
  //   停止の解除で審査なしに掲載へ戻るのを防ぐ（停止時の取り下げと同じ扱いにする）
  if (action === 'approve' && seller) {
    const { data: latest } = await supabaseAdmin!.from('store_sellers').select('status').eq('id', seller.id).single()
    if (latest?.status !== 'approved') {
      await supabaseAdmin!.from('store_products').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ error: '出品者の状態が変わったため、掲載しませんでした' }, { status: 409 })
    }
  }

  const to = seller?.identity?.email
  if (to) {
    await notifySellerReviewed({
      to,
      kind: 'product',
      approved: action === 'approve',
      name: product.title,
      note,
    })
  }
  return NextResponse.json({ ok: true })
}
