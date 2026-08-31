import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { isPushConfigured, sendAndLogPush } from '@/lib/push'

// 管理画面からの手動配信。お知らせ・空き枠案内など、日程追加以外の通知に使う。

/**
 * サイト内のパスか。
 *
 * ⚠ startsWith('/') だけでは足りない。'//evil.com/x' も '/' で始まるので通ってしまい、
 *   sw.js が new URL('//evil.com/x', 'https://3dlab.jp') = 'https://evil.com/x' を開く。
 *   3DLab の名前で任意の外部サイトを開かせられる（2026-08-31 のレビューで指摘）。
 *   受け取る側（sw.js）と同じ解決をして、原点が変わらないことで判定する。
 */
function isSiteInternalPath(url: string): boolean {
  if (!url.startsWith('/')) return false
  const base = 'https://site.invalid'
  try {
    return new URL(url, base).origin === base
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: 'VAPID キーが未設定のため通知を送れません（NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY）' },
      { status: 503 }
    )
  }

  try {
    const { title, body, url } = await request.json()

    if (typeof title !== 'string' || !title.trim() || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'タイトルと本文を入力してください' }, { status: 400 })
    }
    // 通知タップの遷移先はサイト内のみ許可する
    if (url != null && (typeof url !== 'string' || !isSiteInternalPath(url))) {
      return NextResponse.json({ error: 'リンク先はサイト内のパス（/ で始まる）にしてください' }, { status: 400 })
    }

    const result = await sendAndLogPush({
      kind: 'manual',
      topic: 'announcement',
      payload: {
        title: title.trim().slice(0, 100),
        body: body.trim().slice(0, 300),
        url: url || '/workshops',
        // ⚠ tag を省かない。省くと sw.js の既定 tag（'3dlab-notification'）に落ち、
        //   同じ tag の通知は端末上で上書きされる＝先に送ったお知らせが、
        //   読まれる前に次のお知らせに置き換わる（2026-08-31 のレビューで指摘）。
        //   お知らせは1通ずつ残ってほしいので、毎回違う tag にする
        tag: `announce-${Date.now().toString(36)}`,
      },
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('push send error:', error)
    const message = error instanceof Error ? error.message : '通知の送信に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
