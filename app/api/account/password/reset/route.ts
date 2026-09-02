import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import {
  consumeAuthToken,
  hashPassword,
  passwordProblem,
  issueSession,
} from '@/lib/customer-auth'

/**
 * 新しいパスワードを設定する。
 *
 * ⚠ 再設定できた時点でメールアドレスの持ち主であることが確かめられているので、
 *   未確認だったアカウントもここで確認済みにする。
 * ⚠ パスワードが変わると、既存のセッションは署名が合わなくなって全部切れる
 *   （lib/customer-auth.ts の passwordFingerprint）。盗まれたあとの締め出しに要る。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 20

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`account-reset-submit:${ip}`, { windowMs: WINDOW_MS, max: MAX_ATTEMPTS })) {
    return NextResponse.json({ error: '回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const problem = passwordProblem(body.password)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const customerId = await consumeAuthToken(body.token, 'reset')
  if (!customerId) {
    return NextResponse.json(
      { error: 'リンクの有効期限が切れているか、すでに使われています。お手数ですがもう一度お申し込みください。' },
      { status: 400 }
    )
  }

  const passwordHash = await hashPassword(body.password as string)
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update({ password_hash: passwordHash, email_verified_at: new Date().toISOString() })
    .eq('id', customerId)
    .select('id')
    .single()

  if (error || !customer) {
    console.error('password reset update failed:', error)
    return NextResponse.json({ error: '設定に失敗しました' }, { status: 500 })
  }

  const session = issueSession(customer.id, passwordHash)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(session.name, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })
  return response
}
