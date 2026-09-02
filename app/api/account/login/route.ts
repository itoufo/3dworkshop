import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { siteUrl } from '@/lib/site-url'
import {
  verifyPassword,
  issueSession,
  createAuthToken,
  VERIFY_TOKEN_TTL_MS,
} from '@/lib/customer-auth'
import { sendEmail, generateCustomerVerifyEmail } from '@/app/lib/email'

/**
 * ログイン。
 *
 * ⚠ 「メールアドレスが存在しない」と「パスワードが違う」を区別して返さない。
 *   区別すると、誰が客かを総当たりで調べられる。
 * ⚠ 回数制限はメールアドレスごとにも掛ける。接続元だけだと、
 *   1つのアカウントに大量の当て推量を投げられる。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 15 * 60 * 1000
const MAX_PER_IP = 20
const MAX_PER_EMAIL = 8

const GENERIC_ERROR = 'メールアドレスまたはパスワードが違います'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`account-login-ip:${ip}`, { windowMs: WINDOW_MS, max: MAX_PER_IP })) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
  }

  if (await tooManyRequests(`account-login-email:${email}`, { windowMs: WINDOW_MS, max: MAX_PER_EMAIL })) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, name, password_hash, email_verified_at')
    .eq('email', email)
    .maybeSingle()

  if (!customer?.password_hash) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
  }

  const ok = await verifyPassword(password, customer.password_hash)
  if (!ok) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 })
  }

  // パスワードが合っている相手にだけ、未確認であることを伝える（これなら存在は漏れない）
  if (!customer.email_verified_at) {
    try {
      const token = await createAuthToken(customer.id, 'verify', VERIFY_TOKEN_TTL_MS)
      const mail = generateCustomerVerifyEmail({
        name: customer.name || 'お客様',
        verifyUrl: `${siteUrl()}/api/account/verify?token=${token}`,
        validHours: Math.round(VERIFY_TOKEN_TTL_MS / 3600000),
      })
      await sendEmail({ to: email, subject: mail.subject, html: mail.html })
    } catch (err) {
      console.error('re-send verify email failed:', err)
    }
    return NextResponse.json(
      { error: 'メールアドレスの確認がまだ済んでいません。確認メールを送り直しましたのでご確認ください。' },
      { status: 403 }
    )
  }

  const session = issueSession(customer.id, customer.password_hash)
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
