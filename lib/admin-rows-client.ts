'use client'

import { adminJson } from '@/lib/admin-api-client'

/**
 * 管理画面から公開コンテンツ用テーブルを読み書きする（一覧・1件取得・追加・更新）。
 * サーバー側は lib/admin-rows.ts。削除は lib/admin-delete-client.ts。
 *
 * ⚠ 管理画面から `@/lib/supabase`（公開の anon キー）で直接書き込まない。anon は公開中の行を
 *   読むことしかできないので、書き込みは通らず、非公開の行（下書き・非公開ワークショップ・
 *   クーポン）は一覧に出てこない。エラーにもならないので気づけない。
 */

export type AdminRowsResource =
  | 'workshops'
  | 'workshop-sessions'
  | 'workshop-categories'
  | 'blog-posts'
  | 'products'
  | 'coupons'

type Scalar = string | number | boolean | null

export type AdminListOptions = {
  /** 等値の絞り込み。例 { is_service: false } */
  filter?: Record<string, Scalar>
  /** 並び順。例 'is_pinned.desc,created_at.desc'（nullslast / nullsfirst も付けられる） */
  order?: string
  /** 返す列。例 'id,title'。省くと全列 */
  columns?: string
}

/**
 * 型を付けずに使うときの行の型。型のない supabase-js が返していたもの（any）と同じ扱い。
 * 列が決まっている呼び出しでは `adminRows.list<Workshop>(...)` のように型を渡す。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AdminRow = Record<string, any>

/**
 * supabase-js と同じ形（data か error のどちらか）で返す。
 * 401（管理 API 用の署名付き cookie が無い/切れた）は adminJson がログイン画面へ戻す。
 */
export type AdminResult<T> = { data: T; error: null } | { data: null; error: { message: string } }

async function call<TBody, T>(
  url: string,
  init: RequestInit | undefined,
  pick: (body: TBody) => T,
): Promise<AdminResult<T>> {
  const result = await adminJson<TBody>(url, init)
  if (!result.ok) return { data: null, error: { message: result.message } }
  return { data: pick(result.data), error: null }
}

function listUrl(resource: AdminRowsResource, options: AdminListOptions): string {
  const params = new URLSearchParams()
  if (options.filter) params.set('filter', JSON.stringify(options.filter))
  if (options.order) params.set('order', options.order)
  if (options.columns) params.set('columns', options.columns)
  const query = params.toString()
  return `/api/admin/${resource}${query ? `?${query}` : ''}`
}

export const adminRows = {
  /** 一覧（全件）。非公開の行も含む */
  list<T = AdminRow>(resource: AdminRowsResource, options: AdminListOptions = {}): Promise<AdminResult<T[]>> {
    return call<{ rows: T[] }, T[]>(listUrl(resource, options), undefined, (body) => body.rows ?? [])
  },

  /** 1件取得。無ければ error */
  get<T = AdminRow>(resource: AdminRowsResource, id: string): Promise<AdminResult<T>> {
    return call<{ row: T }, T>(`/api/admin/${resource}/${encodeURIComponent(id)}`, undefined, (body) => body.row)
  },

  /** 1件追加。追加した行を返す */
  insert<T = AdminRow>(resource: AdminRowsResource, values: Record<string, unknown>): Promise<AdminResult<T>> {
    return call<{ row: T }, T>(
      `/api/admin/${resource}`,
      { method: 'POST', body: JSON.stringify(values) },
      (body) => body.row,
    )
  },

  /** 1件更新。更新後の行を返す。対象が無ければ error */
  update<T = AdminRow>(
    resource: AdminRowsResource,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<AdminResult<T>> {
    return call<{ row: T }, T>(
      `/api/admin/${resource}/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(patch) },
      (body) => body.row,
    )
  },
}
