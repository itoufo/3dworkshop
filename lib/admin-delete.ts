import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 管理画面からの1件削除。
 *
 * 以前は管理画面（client component）が公開の anon キーで直接 DELETE していた。
 * anon キーはブラウザに配られているので、ワークショップ・商品・記事・顧客を
 * 誰でも消せる状態だった。削除は全部このサーバー経路に寄せ、
 * DB 側では anon から DELETE / TRUNCATE を剥がす
 * （supabase/migrations/20260919000000_revoke_anon_delete.sql）。
 *
 * 呼べるテーブルは ALLOWED_TABLES に限る。ルート側から任意のテーブル名が
 * 渡る形にはしない。
 */
const ALLOWED_TABLES = [
  'workshops',
  'workshop_sessions',
  'workshop_categories',
  'blog_posts',
  'products',
] as const

export type AdminDeletableTable = (typeof ALLOWED_TABLES)[number]

/**
 * 削除前に「予約が紐づいていないか」を確認するテーブルと、bookings 側の参照カラム。
 *
 * 外部キー任せにはできない。実際の定義は次のとおりで、どちらも DB は止めてくれない:
 *   - bookings.workshop_id → workshops   ON DELETE CASCADE
 *     ワークショップを1件消すと、その予約（＝決済記録）が黙って全部消える。
 *     2026-09-19 時点で、予約のあるワークショップは62件・巻き添えになる予約は211件
 *     （うち確定131件）。
 *   - bookings.session_id  → workshop_sessions  ON DELETE SET NULL
 *     日程を消すと、予約が日程を失って宙に浮く。
 *
 * 管理画面は前から「予約があると削除できない」と案内しているので、実際にそうする。
 */
const BOOKING_GUARD: Partial<Record<AdminDeletableTable, 'workshop_id' | 'session_id'>> = {
  workshops: 'workshop_id',
  workshop_sessions: 'session_id',
}

export async function handleAdminDelete(
  table: AdminDeletableTable,
  id: string,
): Promise<Response> {
  const denied = await requireAdmin()
  if (denied) return denied

  if (!ALLOWED_TABLES.includes(table)) {
    return Response.json({ error: 'bad_request' }, { status: 400 })
  }
  if (!id) {
    return Response.json({ error: 'bad_request', message: 'id がありません' }, { status: 400 })
  }

  const guardColumn = BOOKING_GUARD[table]
  if (guardColumn) {
    const { count, error: guardError } = await supabaseAdmin!
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq(guardColumn, id)

    if (guardError) {
      console.error(`[admin/delete] ${table} ${id} guard`, guardError.message)
      return Response.json({ error: 'db_error', message: guardError.message }, { status: 500 })
    }
    if ((count ?? 0) > 0) {
      return Response.json(
        { error: 'in_use', message: `予約が ${count} 件紐づいています` },
        { status: 409 },
      )
    }
  }

  const { error } = await supabaseAdmin!.from(table).delete().eq('id', id)

  if (error) {
    console.error(`[admin/delete] ${table} ${id}`, error.message)
    // 23503 = 外部キー違反。注文や予約が紐づいていて消せない状態で、
    // 呼び出し側はこれを「消せません」と案内に出し分けるため 409 で返す。
    const inUse = error.code === '23503'
    return Response.json(
      { error: inUse ? 'in_use' : 'db_error', message: error.message },
      { status: inUse ? 409 : 500 },
    )
  }

  return Response.json({ ok: true })
}
