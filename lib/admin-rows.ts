import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { fetchAllRows } from '@/lib/supabase-fetch-all'

/**
 * 管理画面からの、公開コンテンツ用テーブルの読み書き（一覧・1件取得・追加・更新）。
 * 削除は lib/admin-delete.ts。
 *
 * 管理画面（client component）は公開の anon キーしか持てない。anon に書き込みを許すと
 * 管理者と一般の訪問者を区別できないので、読み書きはこのサーバー経路（service role）に寄せ、
 * DB 側では anon を「公開中の行を読むだけ」に絞る。
 *
 * ⚠ 呼べるテーブルは ALLOWED_TABLES に限る。ルート側から任意のテーブル名が渡る形にはしない。
 *   顧客・予約などの個人情報のテーブルはここに足さない（返す列を絞った専用のルートがある）。
 * ⚠ 列名・並び順はリクエストから受け取るので、識別子の形（英小文字・数字・_）だけを通す。
 *   PostgREST の埋め込み（`*, other_table(*)`）は書けない＝ここから他のテーブルは読めない。
 */
const ALLOWED_TABLES = [
  'workshops',
  'workshop_sessions',
  'workshop_categories',
  'blog_posts',
  'products',
  'coupons',
] as const

export type AdminRowsTable = (typeof ALLOWED_TABLES)[number]

const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Scalar = string | number | boolean | null

function badRequest(message: string) {
  return Response.json({ error: 'bad_request', message }, { status: 400 })
}

function dbError(scope: string, error: { code?: string; message: string }) {
  console.error(`[admin/rows] ${scope}`, error.code, error.message)
  // 23505 = 一意制約（スラッグやクーポンコードの重複）。入力で直せるので 409 で伝える。
  // ⚠ それ以外は DB のエラー文をそのまま返さない（画面がそのまま出すことがある）
  if (error.code === '23505') {
    return Response.json(
      { error: 'conflict', message: '同じ値（スラッグ・コードなど）がすでに登録されています' },
      { status: 409 },
    )
  }
  return Response.json({ error: 'db_error', message: 'データベースの処理に失敗しました' }, { status: 500 })
}

async function guard(table: AdminRowsTable): Promise<Response | null> {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!ALLOWED_TABLES.includes(table)) return badRequest('対象のテーブルが正しくありません')
  if (!supabaseAdmin) {
    return Response.json({ error: 'server_misconfigured', message: 'サーバーの設定に問題があります' }, { status: 500 })
  }
  return null
}

/** `a,b,c` → ['a','b','c']。識別子でないものが混じっていたら null */
function parseColumns(raw: string | null): string[] | null {
  if (!raw) return []
  const cols = raw.split(',').map((c) => c.trim())
  return cols.every((c) => IDENTIFIER.test(c)) ? cols : null
}

type OrderSpec = { column: string; ascending: boolean; nullsFirst?: boolean }

/** `col.desc,col2.asc.nullslast` → 並び順。形が違えば null */
function parseOrder(raw: string | null): OrderSpec[] | null {
  if (!raw) return []
  const specs: OrderSpec[] = []
  for (const part of raw.split(',')) {
    const [column, direction, nulls, ...rest] = part.trim().split('.')
    if (rest.length || !IDENTIFIER.test(column ?? '')) return null
    if (direction !== 'asc' && direction !== 'desc') return null
    if (nulls !== undefined && nulls !== 'nullsfirst' && nulls !== 'nullslast') return null
    specs.push({
      column,
      ascending: direction === 'asc',
      ...(nulls ? { nullsFirst: nulls === 'nullsfirst' } : {}),
    })
  }
  return specs
}

/** `{"is_service":false}` → 等値の絞り込み。値は文字列・数値・真偽・null だけ。形が違えば null */
function parseFilter(raw: string | null): Record<string, Scalar> | null {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const filter: Record<string, Scalar> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!IDENTIFIER.test(key)) return null
    if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) return null
    filter[key] = value as Scalar
  }
  return filter
}

async function readObjectBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed: unknown = await req.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    const body = parsed as Record<string, unknown>
    // 列名として通らないキーが混じっていたら受け付けない
    return Object.keys(body).every((k) => IDENTIFIER.test(k)) ? body : null
  } catch {
    return null
  }
}

/**
 * 一覧。クエリ:
 *   filter  … 等値の絞り込み（JSON。例 {"is_service":false}）
 *   order   … 並び順（例 is_pinned.desc,created_at.desc）
 *   columns … 返す列（例 id,title）。省くと全列
 * 1000行で打ち切らず、全件返す。
 */
export async function handleAdminList(table: AdminRowsTable, req: Request): Promise<Response> {
  const blocked = await guard(table)
  if (blocked) return blocked
  const admin = supabaseAdmin!

  const params = new URL(req.url).searchParams
  const columns = parseColumns(params.get('columns'))
  const order = parseOrder(params.get('order'))
  const filter = parseFilter(params.get('filter'))
  if (!columns || !order || !filter) return badRequest('一覧の条件が正しくありません')

  const { data, error } = await fetchAllRows<Record<string, unknown>>((from, to) => {
    let query = admin.from(table).select(columns.length ? columns.join(',') : '*')
    for (const [column, value] of Object.entries(filter)) {
      query = value === null ? query.is(column, null) : query.eq(column, value)
    }
    for (const spec of order) {
      query = query.order(spec.column, {
        ascending: spec.ascending,
        ...(spec.nullsFirst !== undefined ? { nullsFirst: spec.nullsFirst } : {}),
      })
    }
    // ページの境目で行が重複・欠落しないよう、最後に id で順序を一意にする
    return query.order('id', { ascending: true }).range(from, to) as unknown as PromiseLike<{
      data: Record<string, unknown>[] | null
      error: { code?: string; message: string } | null
    }>
  })
  if (error) return dbError(`${table} list`, error)

  return Response.json({ rows: data })
}

/** 1件取得。無ければ 404 */
export async function handleAdminGet(table: AdminRowsTable, id: string): Promise<Response> {
  const blocked = await guard(table)
  if (blocked) return blocked
  if (!UUID.test(id)) return badRequest('対象の指定が正しくありません')

  const { data, error } = await supabaseAdmin!.from(table).select('*').eq('id', id).maybeSingle()
  if (error) return dbError(`${table} get`, error)
  if (!data) return Response.json({ error: 'not_found', message: '対象が見つかりませんでした' }, { status: 404 })

  return Response.json({ row: data })
}

/** 1件追加。追加した行を返す */
export async function handleAdminInsert(table: AdminRowsTable, req: Request): Promise<Response> {
  const blocked = await guard(table)
  if (blocked) return blocked

  const body = await readObjectBody(req)
  if (!body) return badRequest('リクエストの形式が不正です')

  const { data, error } = await supabaseAdmin!.from(table).insert(body).select('*').single()
  if (error || !data) return dbError(`${table} insert`, error ?? { message: 'no row returned' })

  return Response.json({ row: data }, { status: 201 })
}

/** 1件更新。更新後の行を返す */
export async function handleAdminUpdate(table: AdminRowsTable, id: string, req: Request): Promise<Response> {
  const blocked = await guard(table)
  if (blocked) return blocked
  if (!UUID.test(id)) return badRequest('対象の指定が正しくありません')

  const body = await readObjectBody(req)
  if (!body || Object.keys(body).length === 0) return badRequest('リクエストの形式が不正です')
  // id は付け替えさせない
  if ('id' in body) return badRequest('id は変更できません')

  // ⚠ 更新できた行を必ず確かめる。0件でもエラーは出ないので、確かめないと
  //   「保存したのに変わっていない」が画面から分からない
  const { data, error } = await supabaseAdmin!.from(table).update(body).eq('id', id).select('*')
  if (error) return dbError(`${table} update`, error)
  if (!data || data.length === 0) {
    return Response.json({ error: 'not_found', message: '対象が見つかりませんでした' }, { status: 404 })
  }

  return Response.json({ row: data[0] })
}
