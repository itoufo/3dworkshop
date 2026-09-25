import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { verifyMiraiidToken } from '@/lib/store/miraiid'
import { issueStoreSession, STORE_SESSION_COOKIE, storeSessionCookieOptions } from '@/lib/store/session'

/**
 * MiraiID でのログインを、ストアのログイン（store_session）に引き換える。
 *
 * POST { access_token } … MiraiID に問い合わせて本人を確かめ、store_session を発行する
 * DELETE                … ログアウト
 *
 * ⚠ customers 行にはメールアドレスで紐づける。ゲスト購入やスクール申込で既に行がある人は
 *   その行を使う（スクール在籍＝出品資格の判定がこの紐づけに依存する）。
 *   MiraiID 側でメール確認済みの人しか通さない（lib/store/miraiid.ts）。
 * ⚠ 既存の行の氏名は書き換えない。
 * ⚠ 別サイトからの POST を受けない（ログイン CSRF）。受けると、攻撃者が自分の MiraiID の
 *   トークンを被害者のブラウザに送らせ、被害者を攻撃者のアカウントでログインさせられる。
 *   その後に被害者が入れた振込先やデータが攻撃者のアカウントに入る。
 */

/** 同じホストのページから fetch された JSON だけを通す */
function isSameOriginJson(request: NextRequest): boolean {
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

/**
 * メールアドレスを大文字小文字を区別せずに探すための ilike のパターン。
 * ⚠ PostgREST は ilike の値の * を、前に \\ があっても % に読み替える。
 *   * はメールアドレスに使える文字なので、1文字に当たる _ に置き換えて候補を広めに取り、
 *   最後に JS 側で完全一致を確かめる（POST 内の exact）。
 */
function likePattern(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, '_')
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (!isSameOriginJson(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`store-login-ip:${ip}`, { windowMs: 15 * 60 * 1000, max: 30 })) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const user = await verifyMiraiidToken(body?.access_token)
  if (!user) {
    return NextResponse.json(
      { error: 'ログインを確認できませんでした。メールアドレスの確認が済んでいるかご確認ください' },
      { status: 401 }
    )
  }

  // 2回目以降は紐づけ済みの行をそのまま使う（MiraiID 側でメールを変えても同じ人のまま）
  const { data: identity } = await supabaseAdmin
    .from('store_identities')
    .select('customer_id')
    .eq('miraiid_user_id', user.id)
    .maybeSingle()

  let customerId = identity?.customer_id as string | undefined

  if (!customerId) {
    // ⚠ 大文字小文字を区別せずに探す。customers.email は入力のまま保存されている経路があり
    //   （スクール申込など）、区別すると在籍中の生徒に空の別行ができて出品資格が消える。
    //   複数当たったら最も古い行（最初に申し込んだときの行）を使う。
    const { data: matches, error: lookupError } = await supabaseAdmin
      .from('customers')
      .select('id, email')
      .ilike('email', likePattern(user.email))
      .order('created_at', { ascending: true })
      .limit(20)
    if (lookupError) {
      console.error('[store-login] customer lookup failed:', lookupError)
      return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 })
    }

    const exact = (matches ?? []).find((m) => m.email?.toLowerCase() === user.email)
    if (exact) {
      customerId = exact.id
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('customers')
        .insert({ email: user.email, name: user.name || user.email.split('@')[0] })
        .select('id')
        .single()
      if (error || !created) {
        console.error('[store-login] customer insert failed:', error)
        return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 })
      }
      customerId = created.id
    }
  }

  const { error: identityError } = await supabaseAdmin.from('store_identities').upsert(
    {
      miraiid_user_id: user.id,
      customer_id: customerId,
      email: user.email,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: 'miraiid_user_id' }
  )
  if (identityError) {
    console.error('[store-login] identity upsert failed:', identityError)
    return NextResponse.json({ error: 'ログインに失敗しました' }, { status: 500 })
  }

  const session = issueStoreSession(user.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(session.name, session.value, { ...storeSessionCookieOptions, maxAge: session.maxAge })
  return res
}

export async function DELETE(request: NextRequest) {
  // 別サイトから勝手にログアウトさせられないようにする
  if (!isSameOriginJson(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(STORE_SESSION_COOKIE, '', { ...storeSessionCookieOptions, maxAge: 0 })
  return res
}
