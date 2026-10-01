import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPublicProduct, likeCounts } from '@/lib/store/catalog'
import { isSameOriginJson } from '@/lib/store/request'
import { requireStoreUser } from '@/lib/store/session'

export const dynamic = 'force-dynamic'

/** いいね（POST）と取り消し（DELETE）。ログイン必須。返すのは最新の数 */
async function handle(request: NextRequest, context: { params: Promise<{ id: string }> }, like: boolean) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  const auth = await requireStoreUser()
  if ('denied' in auth) return auth.denied

  const { id } = await context.params
  // 公開中の作品だけ。非公開の作品の ID を当てて数を数えられないように
  const product = await getPublicProduct(id)
  if (!product) return NextResponse.json({ error: '作品が見つかりません' }, { status: 404 })

  const { error } = like
    ? await supabaseAdmin
        .from('store_product_likes')
        .upsert(
          { product_id: product.id, miraiid_user_id: auth.user.miraiidUserId },
          { onConflict: 'product_id,miraiid_user_id', ignoreDuplicates: true },
        )
    : await supabaseAdmin
        .from('store_product_likes')
        .delete()
        .eq('product_id', product.id)
        .eq('miraiid_user_id', auth.user.miraiidUserId)
  if (error) {
    console.error('[store-like] failed:', error)
    return NextResponse.json({ error: '保存に失敗しました' }, { status: 500 })
  }

  const counts = await likeCounts([product.id])
  return NextResponse.json({ liked: like, count: counts[product.id] ?? 0 })
}

export function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(request, context, true)
}

export function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(request, context, false)
}
