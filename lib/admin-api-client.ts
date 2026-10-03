'use client'

import Cookies from 'js-cookie'

/** 保存しようとしたときにログインが切れていた場合の案内 */
export const ADMIN_SESSION_EXPIRED_MESSAGE =
  'ログインの有効期限が切れています。入力中の内容を残すため、この画面は開いたままにしています。別のタブで管理画面にログインし直してから、もう一度保存してください。'

/**
 * 管理 API（service role で動くサーバー経路）を呼ぶ。
 *
 * ⚠ 401 は文字で出さずにログイン画面へ戻す。画面側の `admin_auth` cookie は残っているのに
 *   署名付きの `admin_session` だけ切れている状態があり、そのままだと
 *   「ログインしているのに何も読めない」で詰む（app/admin/chat-logs/page.tsx と同じ扱い）。
 * ⚠ 入力フォームの保存では `keepPageOn401` を付ける。再読み込みすると、書きかけの本文が消える。
 *   その場合は案内を出して、画面はそのままにする。
 */
export async function adminJson<T>(
  url: string,
  init?: RequestInit,
  options: { keepPageOn401?: boolean } = {},
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
    if (options.keepPageOn401) {
      alert(ADMIN_SESSION_EXPIRED_MESSAGE)
      return { ok: false, message: ADMIN_SESSION_EXPIRED_MESSAGE }
    }
    Cookies.remove('admin_auth')
    location.reload()
    return { ok: false, message: 'ログインし直してください' }
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, message: body.message || `エラーが起きました（${res.status}）` }
  return { ok: true, data: body as T }
}

/**
 * 管理画面からの画像アップロード（/api/upload-image）。画像の公開 URL を返す。失敗したら例外を投げる。
 *
 * ⚠ ログインが切れていた（401）ときは、再読み込みせず案内を出す。呼ぶのは入力フォームの保存中と
 *   本文エディタの画像挿入で、再読み込みすると書きかけの内容が消える。
 * ⚠ adminJson は使えない（Content-Type を JSON に固定するので、ファイルを送る形式が壊れる）。
 */
export async function uploadAdminImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload-image', { method: 'POST', body: formData })

  if (response.status === 401) {
    alert(ADMIN_SESSION_EXPIRED_MESSAGE)
    throw new Error(ADMIN_SESSION_EXPIRED_MESSAGE)
  }
  if (!response.ok) {
    throw new Error('画像のアップロードに失敗しました')
  }

  const data: { imageUrl?: string } = await response.json()
  if (!data.imageUrl) throw new Error('画像のアップロードに失敗しました')
  return data.imageUrl
}

/**
 * 公開ページのキャッシュ（ISR、最大1時間）をすぐ作り直す。商品・シリーズを保存した後に呼ぶ。
 * 失敗しても保存自体は済んでいるので、画面は止めない（1時間以内には反映される）。
 */
export async function refreshPublicPages(): Promise<void> {
  try {
    const res = await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (!res.ok) console.error('[admin] revalidate', res.status)
  } catch (e) {
    console.error('[admin] revalidate', e)
  }
}
