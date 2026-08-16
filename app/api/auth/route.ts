import { NextRequest, NextResponse } from 'next/server'
import { issueAdminSession } from '@/lib/admin-auth'

// HMAC に node の crypto を使うため、Edge に落とさない
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    // 環境変数から管理者パスワードを取得
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      )
    }

    // パスワードを検証
    const isValid = password === adminPassword

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })

    // 書き込み API 用の署名付きセッションを配る。
    // ⚠ 画面側が入れている admin_auth cookie は JS から作れてしまうので、
    //   API の鍵にはこちらを使う（lib/admin-auth.ts）。
    const session = issueAdminSession(adminPassword)
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
