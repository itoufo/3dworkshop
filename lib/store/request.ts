import type { NextRequest } from 'next/server'

/**
 * 同じホストのページから fetch された JSON だけを通す。ストアの書き込み API は全部これを通す。
 * ⚠ 別サイトからの POST を受けると、ログイン中の人の名前で勝手に出品・申請させられる（CSRF）。
 *   JSON の Content-Type は別サイトからだと事前確認（preflight）が要るので、フォーム投稿では送れない。
 */
export function isSameOriginJson(request: NextRequest): boolean {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return false
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
