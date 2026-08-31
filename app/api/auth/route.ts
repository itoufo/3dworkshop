import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, issueAdminSession, verifyAdminPassword } from '@/lib/admin-auth'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'

// HMAC に node の crypto を使うため、Edge に落とさない
export const runtime = 'nodejs'

/**
 * ⚠ ここはサイトで唯一「パスワードを何度でも当て推量できる」入口。
 *   しかも ADMIN_PASSWORD は管理系 API の署名鍵も兼ねている（lib/admin-auth.ts）ので、
 *   ここが破られると管理画面ごと持っていかれる。回数制限を必ず通すこと
 *   （2026-08-31 のレビューで指摘）。
 */
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 10

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request.headers)
    if (await tooManyRequests(`auth:${ip}`, { windowMs: WINDOW_MS, max: MAX_ATTEMPTS })) {
      return NextResponse.json(
        { error: 'Too many attempts', message: 'しばらく時間をおいてからお試しください。' },
        { status: 429 }
      )
    }

    const { password } = await request.json()

    // 環境変数から管理者パスワードを取得
    if (!process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      )
    }

    // ⚠ === で比べない。掛かった時間で正解が漏れる（lib/admin-auth.ts）
    if (!verifyAdminPassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })

    // 書き込み API 用の署名付きセッションを配る。
    // ⚠ 画面側が入れている admin_auth cookie は JS から作れてしまうので、
    //   API の鍵にはこちらを使う（lib/admin-auth.ts）。
    const session = issueAdminSession(process.env.ADMIN_PASSWORD)
    response.cookies.set(session.name, session.value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: session.maxAge,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

/**
 * ログアウト。
 * ⚠ 画面側で admin_auth を消すだけでは足りない。admin_session は httpOnly なので
 *   ブラウザの JS からは消せず、最大24時間そのまま書き込み API を叩ける状態が残る
 *   （2026-08-31 のレビューで指摘）。消すのはサーバーの仕事。
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  return response
}
