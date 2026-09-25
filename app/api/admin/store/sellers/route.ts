import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * ストアの出品者一覧（申請・承認済み・却下・停止）。
 * ⚠ requireAdmin() 必須。振込先口座が入っているため select で口座は返さない（支払いの画面で扱う）。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const { data, error } = await supabaseAdmin!
    .from('store_sellers')
    .select(`
      id, display_name, slug, bio, status, review_note, applied_at, reviewed_at,
      login_email, enrollment_snapshot,
      customer:customers(name, email)
    `)
    .order('applied_at', { ascending: false })
    .limit(500)
  if (error) {
    console.error('[admin/store/sellers] list failed:', error)
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ sellers: data ?? [] })
}
