import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { siteUrl } from '@/lib/site-url'
import { consumeAuthToken, issueSession } from '@/lib/customer-auth'

/**
 * メール確認のリンク。確認できたらそのままログインさせる。
 * メールのリンクから来るので GET だが、副作用はこの1回だけ（合言葉は使い捨て）。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const base = siteUrl()
  const token = request.nextUrl.searchParams.get('token')

  const customerId = await consumeAuthToken(token, 'verify')
  if (!customerId || !supabaseAdmin) {
    return NextResponse.redirect(`${base}/account/login?verified=expired`)
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update({ email_verified_at: new Date().toISOString() })
    .eq('id', customerId)
    .select('id, password_hash')
    .single()

  if (error || !customer?.password_hash) {
    return NextResponse.redirect(`${base}/account/login?verified=error`)
  }

  const response = NextResponse.redirect(`${base}/account?verified=1`)
  const session = issueSession(customer.id, customer.password_hash)
  response.cookies.set(session.name, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })
  return response
}
