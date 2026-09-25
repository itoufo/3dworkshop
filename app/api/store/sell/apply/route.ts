import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireStoreUser } from '@/lib/store/session'
import { isSameOriginJson } from '@/lib/store/request'
import { checkSellerEligibility } from '@/lib/store/eligibility'
import { notifyAdminSellerApplied } from '@/lib/store/notify'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { SELLER_BIO_MAX, SELLER_NAME_MAX, SELLER_SLUG_PATTERN } from '@/lib/store/product-rules'

/**
 * 出品者の申請。POST { display_name, slug, bio }
 *
 * - 在籍を確かめ（lib/store/eligibility.ts）、確かめた内容を enrollment_snapshot に写して
 *   管理者の承認待ち（applied）にする
 * - 却下された人は申請し直せる。承認済み・停止中の人は申請できない
 * ⚠ 出品者は MiraiID のユーザーに紐づける（customers 行ではない）
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireStoreUser()
  if ('denied' in auth) return auth.denied
  const { user } = auth
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  // 申請のたびに Stripe を呼ぶので、回数を絞る
  if (
    (await tooManyRequests(`store-apply-ip:${clientIp(request.headers)}`, { windowMs: 60 * 60 * 1000, max: 10 })) ||
    (await tooManyRequests(`store-apply-user:${user.miraiidUserId}`, { windowMs: 60 * 60 * 1000, max: 5 }))
  ) {
    return NextResponse.json({ error: '申請の回数が多すぎます。しばらく待ってからお試しください' }, { status: 429 })
  }

  if (user.seller && user.seller.status !== 'rejected') {
    return NextResponse.json({ error: 'すでに申請済みです' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({}))
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : ''
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
  const bio = typeof body.bio === 'string' ? body.bio.trim() : ''

  if (!displayName || displayName.length > SELLER_NAME_MAX) {
    return NextResponse.json({ error: `表示名は1〜${SELLER_NAME_MAX}文字で入れてください` }, { status: 400 })
  }
  if (!SELLER_SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: 'ページのURLは半角英小文字・数字・ハイフンで3〜40文字にしてください（先頭と末尾は英数字）' },
      { status: 400 }
    )
  }
  if (bio.length > SELLER_BIO_MAX) {
    return NextResponse.json({ error: `紹介文は${SELLER_BIO_MAX}文字までです` }, { status: 400 })
  }

  const eligibility = await checkSellerEligibility(user.customerId, user.email)
  if (!eligibility.verified && !eligibility.unverifiedEnrollment) {
    return NextResponse.json({ error: '出品の条件（スクール在籍3ヶ月以上）を確認できませんでした' }, { status: 403 })
  }

  const row = {
    miraiid_user_id: user.miraiidUserId,
    customer_id: user.customerId,
    login_email: user.email,
    display_name: displayName,
    slug,
    bio: bio || null,
    status: 'applied',
    review_note: null,
    applied_at: new Date().toISOString(),
    reviewed_at: null,
    enrollment_snapshot: eligibility.checks,
    updated_at: new Date().toISOString(),
  }

  const { error } = user.seller
    ? await supabaseAdmin.from('store_sellers').update(row).eq('id', user.seller.id)
    : await supabaseAdmin.from('store_sellers').insert(row)

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'そのページのURLはもう使われています' }, { status: 409 })
    }
    console.error('[store/apply] save failed:', error)
    return NextResponse.json({ error: '申請に失敗しました' }, { status: 500 })
  }

  // Stripe で確かめられなかった → 管理者に目立たせる
  await notifyAdminSellerApplied({
    displayName,
    loginEmail: user.email,
    flagged: !eligibility.verified,
  })

  return NextResponse.json({ ok: true })
}
