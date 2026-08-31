import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { isPushConfigured } from '@/lib/push'

// 管理画面の通知タブ用。購読者数と直近の配信履歴を返す。

export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { count } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  const { data: logs } = await supabaseAdmin
    .from('push_notification_log')
    .select('id, kind, title, body, url, sent_count, failed_count, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    configured: isPushConfigured(),
    subscriberCount: count || 0,
    logs: logs || [],
  })
}
