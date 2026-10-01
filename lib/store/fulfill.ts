import 'server-only'
import type Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { notifyStoreCheckoutPaid } from './notify'
import { createStoreDownloadToken, STORE_DOWNLOAD_MAX_COUNT, STORE_DOWNLOAD_VALID_DAYS } from './orders'
import { STORE_URL } from './urls'

/**
 * Stripe の決済が終わった注文を「支払い済み」にし、データの合言葉を発行してメールを送る。
 * 1点の決済（metadata.type = store_order、order_id）とカート（store_cart、checkout_id）の両方がここを通る。
 *
 * ⚠ pending の行だけを paid にする。Stripe は同じイベントを再送するので、2回目以降は0行になり、
 *   メールも合言葉も二重に出ない。
 */
export async function fulfillStorePayment(
  session: Stripe.Checkout.Session,
  match: { checkoutId: string } | { orderId: string },
): Promise<void> {
  if (!supabaseAdmin) throw new Error('Supabase admin client not available')

  const collected = session.collected_information?.shipping_details
  const address = collected?.address
  const now = new Date()

  // ⚠ 1行ずつ「paid・合言葉・住所」を1回の更新で書く（pending のときだけ）。
  //   paid だけ先に書いて合言葉・住所をあとで書くと、その間に失敗したとき再送が「処理済み」で抜け、
  //   合言葉の無いデータ・住所の無い完成品が残る
  const pendingQuery = supabaseAdmin.from('store_orders').select('id, kind').eq('status', 'pending')
  const { data: pending, error: pendingError } = await ('checkoutId' in match
    ? pendingQuery.eq('checkout_id', match.checkoutId)
    : pendingQuery.eq('id', match.orderId))
  if (pendingError) throw pendingError
  if (!pending || pending.length === 0) {
    console.log('[store-fulfill] already processed or missing:', JSON.stringify(match))
    return
  }

  const expiresAt = new Date(now.getTime() + STORE_DOWNLOAD_VALID_DAYS * 86400_000).toISOString()
  const shipping = address
    ? {
        name: collected?.name || null,
        phone: session.customer_details?.phone || null,
        address: address as unknown as Record<string, unknown>,
      }
    : null
  const tokens = new Map<string, string>()
  const paidIds: string[] = []
  for (const row of pending) {
    const token = row.kind === 'data' ? createStoreDownloadToken() : null
    const { data: updated, error } = await supabaseAdmin
      .from('store_orders')
      .update({
        status: 'paid',
        paid_at: now.toISOString(),
        updated_at: now.toISOString(),
        stripe_session_id: session.id,
        stripe_payment_intent_id: (session.payment_intent as string) || null,
        // お届け先は完成品の行にだけ（データの行には要らない個人情報を置かない）
        ...(row.kind === 'print' ? { shipping } : {}),
        ...(token ? { download_token: token, download_expires_at: expiresAt } : {}),
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
    // 失敗したら投げて Stripe に再送させる。終わった行は paid なので、再送では残りの行だけを処理する
    if (error) throw error
    if (!updated || updated.length === 0) continue // 同時に届いた再送が先に処理した
    paidIds.push(row.id)
    if (token) tokens.set(row.id, token)
  }
  if (paidIds.length === 0) return

  const { data: paid, error: readError } = await supabaseAdmin
    .from('store_orders')
    .select(
      'id, kind, quantity, price, seller_amount, buyer_name, buyer_email, variant_label, created_at, product:store_products(title), seller:store_sellers(display_name, login_email)',
    )
    .in('id', paidIds)
  if (readError || !paid) {
    // 支払いの記録は済んでいる。メールが出せないだけなので、管理画面で拾えるよう記録して終える
    console.error('[store-fulfill] read for email failed:', readError)
    return
  }
  paid.sort((a, b) => a.created_at.localeCompare(b.created_at))

  const shippingLines = address
    ? [
        collected?.name || '',
        address.postal_code ? `〒${address.postal_code}` : '',
        `${address.state || ''}${address.city || ''}${address.line1 || ''}`,
        address.line2 || '',
        session.customer_details?.phone ? `電話 ${session.customer_details.phone}` : '',
      ].filter(Boolean)
    : []

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v)
  await notifyStoreCheckoutPaid({
    orderNo: ('checkoutId' in match ? match.checkoutId : match.orderId).slice(0, 8),
    buyerName: paid[0].buyer_name || session.customer_details?.name || 'お客様',
    buyerEmail: paid[0].buyer_email || session.customer_details?.email || '',
    lines: paid.map((o) => {
      const product = one(o.product as { title: string } | { title: string }[] | null)
      const seller = one(
        o.seller as { display_name: string; login_email: string | null } | { display_name: string; login_email: string | null }[] | null,
      )
      const token = tokens.get(o.id)
      return {
        kind: o.kind as 'data' | 'print',
        title: product?.title ?? '作品',
        variantLabel: o.variant_label,
        quantity: o.quantity ?? 1,
        price: o.price,
        sellerAmount: o.seller_amount,
        sellerName: seller?.display_name ?? '',
        sellerEmail: seller?.login_email ?? null,
        downloadUrl: token ? `${STORE_URL}/download#${token}` : undefined,
      }
    }),
    shippingLines,
    shippingLeadTimeText: SHIPPING_LEAD_TIME_TEXT,
    downloadValidDays: STORE_DOWNLOAD_VALID_DAYS,
    downloadMaxCount: STORE_DOWNLOAD_MAX_COUNT,
  })
}
