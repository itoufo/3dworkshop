'use client'

import Cookies from 'js-cookie'

/**
 * 管理 API（service role で動くサーバー経路）を呼ぶ。
 *
 * ⚠ 401 は文字で出さずにログイン画面へ戻す。画面側の `admin_auth` cookie は残っているのに
 *   署名付きの `admin_session` だけ切れている状態があり、そのままだと
 *   「ログインしているのに何も読めない」で詰む（app/admin/chat-logs/page.tsx と同じ扱い）。
 */
export async function adminJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch (e) {
    console.error(`[admin] ${url}`, e)
    return { ok: false, message: '通信に失敗しました' }
  }

  if (res.status === 401) {
    Cookies.remove('admin_auth')
    location.reload()
    return { ok: false, message: 'ログインし直してください' }
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, message: body.message || `エラーが起きました（${res.status}）` }
  return { ok: true, data: body as T }
}
