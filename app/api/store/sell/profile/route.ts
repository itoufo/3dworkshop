import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireApprovedSeller } from '@/lib/store/session'
import { isSameOriginJson } from '@/lib/store/request'
import { isOwnMediaUrl } from '@/lib/store/storage'
import { SELLER_BIO_MAX, SELLER_NAME_MAX } from '@/lib/store/product-rules'

/**
 * 出品者のプロフィール（表示名・紹介文・アイコン）。PATCH { display_name, bio, avatar_url }
 * ページの URL（slug）は変えられない（共有されたリンクが切れるため）。振込先は支払いの画面で扱う。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireApprovedSeller()
  if ('denied' in auth) return auth.denied
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : ''
  const bio = typeof body.bio === 'string' ? body.bio.trim() : ''
  const avatarUrl = body.avatar_url ?? null

  if (!displayName || displayName.length > SELLER_NAME_MAX) {
    return NextResponse.json({ error: `表示名は1〜${SELLER_NAME_MAX}文字で入れてください` }, { status: 400 })
  }
  if (bio.length > SELLER_BIO_MAX) {
    return NextResponse.json({ error: `紹介文は${SELLER_BIO_MAX}文字までです` }, { status: 400 })
  }
  if (avatarUrl !== null && !isOwnMediaUrl(auth.user.seller.id, avatarUrl)) {
    return NextResponse.json({ error: 'アイコンが不正です。アップロードし直してください' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('store_sellers')
    .update({ display_name: displayName, bio: bio || null, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', auth.user.seller.id)
  if (error) {
    console.error('[store/profile] update failed:', error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
