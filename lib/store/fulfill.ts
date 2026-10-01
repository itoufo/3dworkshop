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

  let query = supabaseAdmin
    .from('store_orders')
    .update({
      status: 'paid',
      paid_at: now.toISOString(),
      updated_at: now.toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent_id: (session.payment_intent as string) || null,
    })
    .eq('status', 'pending')
  query = 'checkoutId' in match ? query.eq('checkout_id', match.checkoutId) : query.eq('id', match.orderId)
  const { data: paid, error } = await query.select(
    'id, kind, quantity, price, seller_amount, buyer_name, buyer_email, variant_label, created_at, product:store_products(title), seller:store_sellers(display_name, login_email)',
  )
  if (error) throw error
  if (!paid || paid.length === 0) {
    console.log('[store-fulfill] already processed or missing:', JSON.stringify(match))
    return
  }
  paid.sort((a, b) => a.created_at.localeCompare(b.created_at))

  // お届け先は完成品の行にだけ持たせる（データの行には要らない個人情報を置かない）
  if (address && paid.some((o) => o.kind === 'print')) {
    const { error: shipError } = await supabaseAdmin
      .from('store_orders')
      .update({
        shipping: {
          name: collected?.name || null,
          phone: session.customer_details?.phone || null,
          address: address as unknown as Record<string, unknown>,
        },
      })
      .in('id', paid.filter((o) => o.kind === 'print').map((o) => o.id))
    if (shipError) console.error('[store-fulfill] shipping save failed:', shipError)
  }

  // データの行ごとに合言葉を発行する（行ごとに回数と期限を数える）
  const tokens = new Map<string, string>()
  const expiresAt = new Date(now.getTime() + STORE_DOWNLOAD_VALID_DAYS * 86400_000).toISOString()
  for (const o of paid.filter((o) => o.kind === 'data')) {
    const token = createStoreDownloadToken()
    const { error: tokenError } = await supabaseAdmin
      .from('store_orders')
      .update({ download_token: token, download_expires_at: expiresAt })
      .eq('id', o.id)
    if (tokenError) {
      // ⚠ ここで投げると、paid にした行が再送で0行になり合言葉が永久に出ない。記録して続け、
      //   管理画面の「ダウンロード用リンクを表示」が使えない行として人が気づけるようにする
      console.error('[store-fulfill] token save failed:', o.id, tokenError)
      continue
    }
    tokens.set(o.id, token)
  }

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
