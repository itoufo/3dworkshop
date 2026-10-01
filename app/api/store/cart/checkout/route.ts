import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { stripe, checkoutExpiresAt } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { publishedDataFiles, resolveCart } from '@/lib/store/cart-server'
import { splitPrice } from '@/lib/store/pricing'
import { isSameOriginJson } from '@/lib/store/request'
import { currentStoreUser } from '@/lib/store/session'
import { STORE_DOWNLOAD_VALID_DAYS } from '@/lib/store/orders'
import { STORE_URL } from '@/lib/store/urls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

/**
 * ストアの決済。カートの中身（作品ページの「今すぐ購入」は1点のカート）をまとめて1回の Stripe 決済にする。
 * 本サイトのカート（app/api/cart/checkout）と同じ形: 注文は1行＝1明細、同じ決済の行を checkout_id で束ねる。
 *
 * ⚠ 価格はブラウザから受け取らない。resolveCart が作品の値から決める。
 * ⚠ 買えるのは「公開中」かつ「出品者が承認済み」の作品だけ。
 * ⚠ customers 行は作らない・書き換えない。購入者の名前とメールは注文の行にだけ持つ。
 * ⚠ 完成品が1つでもあれば住所を Stripe で受け取る。データだけなら聞かない。
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ message: '不正なリクエストです' }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 })

  try {
    const body = (await request.json().catch(() => ({}))) as { name?: unknown; email?: unknown; items?: unknown }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!name || name.length > 100) return NextResponse.json({ message: 'お名前を入力してください' }, { status: 400 })
    if (!emailValid(email)) return NextResponse.json({ message: 'メールアドレスを正しく入力してください' }, { status: 400 })

    const resolved = await resolveCart(body.items)
    if ('error' in resolved) return NextResponse.json({ message: resolved.error }, { status: 400 })
    const problem = resolved.lines.find((l) => l.problem)
    if (problem) {
      return NextResponse.json({ message: `「${problem.title}」: ${problem.problem}`, key: problem.key }, { status: 409 })
    }

    // ⚠ データが無いと、払ってもらってから渡せない・印刷できない。決済の前に確かめ、注文に写す
    const files = await publishedDataFiles(resolved.lines.map((l) => l.productId))
    const missing = resolved.lines.find((l) => !files.has(l.productId))
    if (missing) {
      console.error('[store-cart] product has no data file or was unpublished', missing.productId)
      return NextResponse.json({ message: `「${missing.title}」はいま購入できません。カートから外してください`, key: missing.key }, { status: 409 })
    }

    const user = await currentStoreUser()
    const checkoutId = randomUUID()
    // まとめて入れると created_at が全行同じになる。カートの順に並べられるよう1ミリ秒ずつずらす
    const insertedAt = Date.now()
    const rows = resolved.lines.map((l, index) => {
      const share = splitPrice(l.kind, l.unitPrice)
      const file = files.get(l.productId)!
      return {
        checkout_id: checkoutId,
        product_id: l.productId,
        seller_id: l.sellerId,
        kind: l.kind,
        quantity: l.quantity,
        // price は1個の価格。手数料と取り分はこの行の合計
        price: l.unitPrice,
        platform_fee: share.platformFee * l.quantity,
        seller_amount: share.sellerAmount * l.quantity,
        variant_id: l.variantId,
        variant_label: l.variantLabel,
        data_file_path: file.path,
        data_file_name: file.name,
        buyer_customer_id: user?.customerId ?? null,
        buyer_email: email,
        buyer_name: name,
        status: 'pending',
        created_at: new Date(insertedAt + index).toISOString(),
      }
    })
    const { error: insertError } = await supabaseAdmin.from('store_orders').insert(rows)
    if (insertError) {
      console.error('[store-cart] insert failed:', insertError)
      return NextResponse.json({ message: '注文の作成に失敗しました' }, { status: 500 })
    }

    const hasPrint = resolved.lines.some((l) => l.kind === 'print')
    let session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: resolved.lines.map((l) => ({
          price_data: {
            currency: 'jpy' as const,
            product_data: {
              name: `${l.title}（${l.kind === 'data' ? '3D データ' : l.variantLabel ? `完成品・${l.variantLabel}` : '完成品'}）`,
              description:
                l.kind === 'data'
                  ? `3Dプリント用データ／ダウンロード期限 ${STORE_DOWNLOAD_VALID_DAYS}日`
                  : `${SHIPPING_LEAD_TIME_TEXT}・送料無料`,
              ...(l.imageUrl ? { images: [l.imageUrl] } : {}),
            },
            unit_amount: l.unitPrice,
          },
          quantity: l.quantity,
        })),
        customer_email: email,
        locale: 'ja',
        expires_at: checkoutExpiresAt(),
        ...(hasPrint
          ? {
              shipping_address_collection: { allowed_countries: ['JP' as const] },
              phone_number_collection: { enabled: true },
            }
          : {}),
        success_url: `${STORE_URL}/thanks?checkout=${checkoutId}`,
        cancel_url: `${STORE_URL}/cart`,
        metadata: { type: 'store_cart', checkout_id: checkoutId },
      })
    } catch (err) {
      // 決済画面を作れなかった注文は残さない（決済待ちのまま一覧に溜まる）
      await supabaseAdmin.from('store_orders').delete().eq('checkout_id', checkoutId).eq('status', 'pending')
      throw err
    }

    await supabaseAdmin.from('store_orders').update({ stripe_session_id: session.id }).eq('checkout_id', checkoutId)
    return NextResponse.json({ url: session.url, checkoutId })
  } catch (err) {
    console.error('[store-cart] checkout failed:', err)
    return NextResponse.json({ message: '決済の準備に失敗しました' }, { status: 500 })
  }
}
