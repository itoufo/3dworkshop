import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { siteUrl } from '@/lib/site-url'
import {
  hashPassword,
  passwordProblem,
  createAuthToken,
  VERIFY_TOKEN_TTL_MS,
} from '@/lib/customer-auth'
import {
  sendEmail,
  generateCustomerVerifyEmail,
  generateCustomerAlreadyRegisteredEmail,
} from '@/app/lib/email'

/**
 * 会員登録。
 *
 * ⚠ すでに customers に居るメールアドレス（ゲストで購入した人）には、
 *   その行にパスワードを付ける。過去の注文がそのまま見えるようになるため、
 *   メール確認を通すまでは絶対にログインさせない（lib/customer-auth.ts）。
 *
 * ⚠ 「そのメールアドレスは登録済みです」と画面に返さない。
 *   誰が客かを総当たりで調べられてしまう。登録済みの場合も同じ文言を返し、
 *   本人にだけメールで知らせる。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 60 * 1000
const MAX_ATTEMPTS = 10

/** 登録済みかどうかを問わず返す文言 */
const GENERIC_OK = {
  ok: true,
  message: 'ご入力のメールアドレスに確認メールをお送りしました。メール内のリンクから登録を完了してください。',
}

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`account-register:${ip}`, { windowMs: WINDOW_MS, max: MAX_ATTEMPTS })) {
    return NextResponse.json({ error: '回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''
  const password = body.password

  if (!name) return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
  if (!emailValid(email)) {
    return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
  }
  const problem = passwordProblem(password)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const base = siteUrl()

  const { data: existing } = await supabaseAdmin
    .from('customers')
    .select('id, name, email, password_hash, email_verified_at')
    .eq('email', email)
    .maybeSingle()

  // すでに会員になっている場合は、何も変更せず本人にだけ知らせる
  if (existing?.password_hash && existing.email_verified_at) {
    try {
      const mail = generateCustomerAlreadyRegisteredEmail({
        name: existing.name || name,
        loginUrl: `${base}/account/login`,
        resetUrl: `${base}/account/password/forgot`,
      })
      await sendEmail({ to: email, subject: mail.subject, html: mail.html })
    } catch (err) {
      console.error('already-registered notice failed:', err)
    }
    return NextResponse.json(GENERIC_OK)
  }

  const passwordHash = await hashPassword(password as string)

  // ゲストで購入したことがある人はその行を使う。無ければ作る。
  //
  // ⚠ 既存の行の氏名・電話番号は書き換えない。ここはメール確認を通す前に
  //   誰でも叩ける口なので、他人のメールアドレスを指定して、その人の注文に
  //   使われている氏名を上書きできてしまう。名乗りを受け入れるのは確認後だけにする。
  const { data: customer, error } = existing?.id
    ? await supabaseAdmin
        .from('customers')
        .update({
          password_hash: passwordHash,
          // 再登録のときは確認をやり直させる
          email_verified_at: null,
        })
        .eq('id', existing.id)
        .select('id, name')
        .single()
    : await supabaseAdmin
        .from('customers')
        .insert({
          email,
          name,
          ...(phone ? { phone } : {}),
          password_hash: passwordHash,
          account_created_at: new Date().toISOString(),
          email_verified_at: null,
        })
        .select('id, name')
        .single()

  if (error || !customer) {
    console.error('customer register upsert failed:', error)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }

  try {
    const token = await createAuthToken(customer.id, 'verify', VERIFY_TOKEN_TTL_MS)
    const mail = generateCustomerVerifyEmail({
      name: customer.name || name,
      verifyUrl: `${base}/api/account/verify?token=${token}`,
      validHours: Math.round(VERIFY_TOKEN_TTL_MS / 3600000),
    })
    const result = await sendEmail({ to: email, subject: mail.subject, html: mail.html })
    if (!result.success) {
      console.error('verify email failed:', result.error)
      return NextResponse.json(
        { error: '確認メールを送信できませんでした。時間をおいてお試しください' },
        { status: 502 }
      )
    }
  } catch (err) {
    console.error('verify token/email error:', err)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }

  return NextResponse.json(GENERIC_OK)
}
