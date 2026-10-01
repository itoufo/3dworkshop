'use client'

import Cookies from 'js-cookie'

/**
 * 管理画面からストアの管理 API を呼ぶ。
 * 401（admin_session が切れた）なら画面側のログイン印も捨ててログイン画面に戻す
 * （lib/admin-delete-client.ts と同じ扱い。「画面上はログイン済みなのに何もできない」を避ける）。
 */
export async function adminFetch<T = object>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; body: Partial<T> & { error?: string } }> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
  })
  if (res.status === 401) {
    Cookies.remove('admin_auth')
    location.reload()
    return { ok: false, body: {} }
  }
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, body }
}
