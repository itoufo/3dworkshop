'use client'

import Cookies from 'js-cookie'

// 管理画面からの削除は API 経由に寄せる。
// 以前は client component が公開の anon キーで直接 DELETE していたが、
// anon キーはブラウザに配られているので誰でも消せる状態だった（lib/admin-delete.ts）。

export type AdminDeletableResource =
  | 'workshops'
  | 'workshop-sessions'
  | 'workshop-categories'
  | 'blog-posts'
  | 'products'

/**
 * 1件削除する。成功なら null、失敗なら画面に出すメッセージを返す。
 *
 * 401（書き込み用の httpOnly cookie `admin_session` が無い/切れた）のときは、
 * 画面側の `admin_auth` も捨ててログイン画面に戻す。
 * 「画面上はログイン済みなのに消せない」状態は人手で気づけないため
 * （app/admin/chat-knowledge/page.tsx と同じ扱い）。
 */
export async function deleteAdminRecord(
  resource: AdminDeletableResource,
  id: string,
  messages: { inUse: string; failed: string },
): Promise<string | null> {
  let res: Response
  try {
    res = await fetch(`/api/admin/${resource}/${id}`, { method: 'DELETE' })
  } catch (e) {
    console.error(`delete ${resource} failed:`, e)
    return messages.failed
  }

  if (res.status === 401) {
    Cookies.remove('admin_auth')
    location.reload()
    return null
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    console.error(`delete ${resource} failed:`, res.status, body?.message)
    // 409 = 注文や予約が紐づいていて消せない
    return res.status === 409 ? messages.inUse : messages.failed
  }

  return null
}
