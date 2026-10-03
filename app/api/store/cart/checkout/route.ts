import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { stripe, checkoutExpiresAt } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { publishedDataFiles, resolveCart } from '@/lib/store/cart-server'
import { storeCheckoutSessionParams } from '@/lib/store/checkout-session'
import { storeLocaleOf } from '@/lib/store/locale'
import { STORE_MESSAGES } from '@/lib/store/messages'
import { splitPrice } from '@/lib/store/pricing'
import { isSameOriginJson } from '@/lib/store/request'
import { currentStoreUser } from '@/lib/store/session'

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
 *
 * 本文の locale が 'en' なら、返す文言・決済画面・戻る先・購入後のメールを英語にする
 * （Stripe に渡す内容は lib/store/checkout-session.ts）。
 */
export async function POST(request: NextRequest) {
  // ⚠ 本文を読む前に弾く。このときは言語が分からないので日本語で返す
  if (!isSameOriginJson(request)) return NextResponse.json({ message: STORE_MESSAGES.ja.badRequest }, { status: 403 })
  if (!supabaseAdmin) return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 })

  // ⚠ try の外で決める。途中で失敗したときの文言（catch）にも使う
  let m = STORE_MESSAGES.ja
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: unknown
      email?: unknown
      items?: unknown
      locale?: unknown
    }
    const locale = storeLocaleOf(body.locale)
    m = STORE_MESSAGES[locale]
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    if (!name || name.length > 100) return NextResponse.json({ message: m.nameRequired }, { status: 400 })
    if (!emailValid(email)) return NextResponse.json({ message: m.emailInvalid }, { status: 400 })

    const resolved = await resolveCart(body.items, locale)
    if ('error' in resolved) return NextResponse.json({ message: resolved.error }, { status: 400 })
    const problem = resolved.lines.find((l) => l.problem)
    if (problem) {
      return NextResponse.json({ message: m.lineProblem(problem.title, problem.problem!), key: problem.key }, { status: 409 })
    }

    // ⚠ データが無いと、払ってもらってから渡せない・印刷できない。決済の前に確かめ、注文に写す
    const files = await publishedDataFiles(resolved.lines.map((l) => l.productId))
    const missing = resolved.lines.find((l) => !files.has(l.productId))
    if (missing) {
      console.error('[store-cart] product has no data file or was unpublished', missing.productId)
      return NextResponse.json({ message: m.lineUnavailable(missing.title), key: missing.key }, { status: 409 })
    }

    const user = await currentStoreUser()
    const checkoutId = randomUUID()

    // ⚠ 決済画面を先に作り、注文の行はそのあとに入れる（行には必ず決済画面の ID が付く）。
    //   行を先に入れると、決済画面を作る前に止まったとき、期限切れで消すこともできない決済待ちの行が残る
    const session = await stripe.checkout.sessions.create(
      storeCheckoutSessionParams({ lines: resolved.lines, email, checkoutId, locale, expiresAt: checkoutExpiresAt() }),
    )

    // まとめて入れると created_at が全行同じになる。カートの順に並べられるよう1ミリ秒ずつずらす
    const insertedAt = Date.now()
    const rows = resolved.lines.map((l, index) => {
      const share = splitPrice(l.kind, l.unitPrice)
      const file = files.get(l.productId)!
      return {
        checkout_id: checkoutId,
        stripe_session_id: session.id,
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
      // 注文の無い決済画面で払えないよう、すぐ失効させる
      await stripe.checkout.sessions.expire(session.id).catch((e) => console.error('[store-cart] expire failed:', e))
      return NextResponse.json({ message: m.orderCreateFailed }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, checkoutId })
  } catch (err) {
    console.error('[store-cart] checkout failed:', err)
    return NextResponse.json({ message: m.checkoutFailed }, { status: 500 })
  }
}
