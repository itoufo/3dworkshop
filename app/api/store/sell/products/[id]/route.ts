import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireApprovedSeller } from '@/lib/store/session'
import { isSameOriginJson } from '@/lib/store/request'
import { parseProductInput, submitProblem } from '@/lib/store/product-input'
import { notifyAdminProductSubmitted } from '@/lib/store/notify'

/**
 * 作品の保存・審査への提出・取り下げ。
 *
 * PATCH { action: 'save' | 'submit', ...入力 } … 保存（submit なら保存して審査へ）
 * PATCH { action: 'withdraw' }                  … 取り下げ（ストアから外す）
 *
 * ⚠ 掲載中の作品を保存したら審査中に戻す（審査のあいだは非掲載）。
 *   審査を通した内容を、あとから価格やデータだけ差し替えて売れないようにする。
 * ⚠ 必ず自分の作品か（seller_id）で絞る。他人の作品の ID を送っても 404。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireApprovedSeller()
  if ('denied' in auth) return auth.denied
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sellerId = auth.user.seller.id
  const { data: current } = await supabaseAdmin
    .from('store_products')
    .select('id, status')
    .eq('id', id)
    .eq('seller_id', sellerId)
    .maybeSingle()
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const action = body?.action
  const now = new Date().toISOString()

  if (action === 'withdraw') {
    const { error } = await supabaseAdmin
      .from('store_products')
      .update({ status: 'archived', updated_at: now })
      .eq('id', id)
      .eq('seller_id', sellerId)
    if (error) return NextResponse.json({ error: '取り下げに失敗しました' }, { status: 500 })
    return NextResponse.json({ ok: true, status: 'archived' })
  }

  if (action !== 'save' && action !== 'submit') {
    return NextResponse.json({ error: 'action が不正です' }, { status: 400 })
  }

  const parsed = parseProductInput(sellerId, body)
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })

  let status: string = current.status
  const extra: Record<string, unknown> = {}
  // 提出したとき・掲載中や審査中の内容を変えたときは、審査（やり直し）に回す
  if (action === 'submit' || current.status === 'published' || current.status === 'pending_review') {
    // ⚠ 保存だけの場合も確かめる。掲載中の作品からデータを外して保存すると、
    //   中身の無い作品が審査に来てしまう
    const problem = await submitProblem(parsed.values)
    if (problem) return NextResponse.json({ error: problem }, { status: 400 })
    status = 'pending_review'
    extra.submitted_at = now
    extra.review_note = null
  } else if (current.status === 'archived') {
    status = 'draft'
  }

  const { error } = await supabaseAdmin
    .from('store_products')
    .update({ ...parsed.values, ...extra, status, updated_at: now })
    .eq('id', id)
    .eq('seller_id', sellerId)
  if (error) {
    console.error('[store/products] update failed:', error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }

  if (status === 'pending_review' && current.status !== 'pending_review') {
    await notifyAdminProductSubmitted({ title: parsed.values.title, sellerName: auth.user.seller.displayName })
  }

  return NextResponse.json({ ok: true, status })
}
