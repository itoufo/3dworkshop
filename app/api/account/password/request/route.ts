import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { siteUrl } from '@/lib/site-url'
import { createAuthToken, RESET_TOKEN_TTL_MS } from '@/lib/customer-auth'
import { sendEmail, generateCustomerPasswordResetEmail } from '@/app/lib/email'

/**
 * パスワード再設定の申し込み。
 *
 * ⚠ 「そのメールアドレスは登録されていません」と返さない。
 *   誰が客かを総当たりで調べられてしまう。登録が無くても同じ文言を返す。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_IP = 10
const MAX_PER_EMAIL = 5

const GENERIC_OK = {
  ok: true,
  message: 'ご登録があれば、再設定用のリンクをメールでお送りしました。',
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`account-reset-ip:${ip}`, { windowMs: WINDOW_MS, max: MAX_PER_IP })) {
    return NextResponse.json({ error: '回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
  if (!email) return NextResponse.json(GENERIC_OK)

  if (await tooManyRequests(`account-reset-email:${email}`, { windowMs: WINDOW_MS, max: MAX_PER_EMAIL })) {
    return NextResponse.json(GENERIC_OK)
  }

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, name, password_hash')
    .eq('email', email)
    .maybeSingle()

  // 会員登録していない相手には送らない。返す文言は同じ
  if (!customer?.password_hash) return NextResponse.json(GENERIC_OK)

  try {
    const token = await createAuthToken(customer.id, 'reset', RESET_TOKEN_TTL_MS)
    const mail = generateCustomerPasswordResetEmail({
      name: customer.name || 'お客様',
      resetUrl: `${siteUrl()}/account/password/reset?token=${token}`,
      validMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    })
    const result = await sendEmail({ to: email, subject: mail.subject, html: mail.html })
    if (!result.success) console.error('password reset email failed:', result.error)
  } catch (err) {
    console.error('password reset token error:', err)
  }

  return NextResponse.json(GENERIC_OK)
}
