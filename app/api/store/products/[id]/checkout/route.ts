import { NextRequest, NextResponse } from 'next/server'
import { stripe, checkoutExpiresAt } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { getPublicProduct } from '@/lib/store/catalog'
import { splitPrice, type StoreOrderKind } from '@/lib/store/pricing'
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
 * ストアの作品の購入。
 *   kind = 'data'  … 3D データのダウンロード。住所は取らない
 *   kind = 'print' … 3DLab が印刷して発送する。住所は Stripe の決済画面で受け取る
 *
 * ⚠ 金額はクライアントから受け取らない。DB の価格だけを使う。
 * ⚠ 買えるのは「公開中」かつ「出品者が承認済み」の作品だけ（getPublicProduct が絞る）。
 * ⚠ customers 行は作らない・書き換えない（customers は email で upsert すると他人の名前を
 *   上書きできてしまう）。購入者の名前とメールは注文の行にだけ持つ。
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginJson(request)) {
    return NextResponse.json({ message: '不正なリクエストです' }, { status: 403 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ message: 'Server misconfigured' }, { status: 500 })
  }

  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { kind?: unknown; name?: unknown; email?: unknown }
    const kind: StoreOrderKind | null = body.kind === 'data' || body.kind === 'print' ? body.kind : null
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''

    if (!kind) return NextResponse.json({ message: '買い方を選んでください' }, { status: 400 })
    if (!name || name.length > 100) return NextResponse.json({ message: 'お名前を入力してください' }, { status: 400 })
    if (!emailValid(email)) {
      return NextResponse.json({ message: 'メールアドレスを正しく入力してください' }, { status: 400 })
    }

    const product = await getPublicProduct(id)
    if (!product) return NextResponse.json({ message: '作品が見つかりません' }, { status: 404 })

    const price = kind === 'data' ? (product.sell_data ? product.data_price : null) : product.sell_print ? product.print_price : null
    if (price == null) {
      return NextResponse.json({ message: 'この作品はその買い方では販売していません' }, { status: 400 })
    }

    // ⚠ データが無いと、払ってもらってから渡せない・印刷できない。決済の前に確かめる
    const { data: files } = await supabaseAdmin
      .from('store_products')
      .select('data_file_path, data_file_name')
      .eq('id', product.id)
      // ⚠ 上で公開中を確かめたあとに出品者がデータを差し替えると、審査前のファイルが注文に写る。ここでも絞る
      .eq('status', 'published')
      .maybeSingle()
    if (!files?.data_file_path) {
      console.error('[store-checkout] product has no data file', product.id)
      return NextResponse.json({ message: 'この作品はいま購入できません' }, { status: 409 })
    }

    const user = await currentStoreUser()
    const { platformFee, sellerAmount } = splitPrice(kind, price)

    const { data: order, error: orderError } = await supabaseAdmin
      .from('store_orders')
      .insert({
        product_id: product.id,
        seller_id: product.seller.id,
        kind,
        price,
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        buyer_customer_id: user?.customerId ?? null,
        buyer_email: email,
        buyer_name: name,
        // 買った時点のデータ。あとで出品者が差し替えても、この注文はこのファイルを使う
        data_file_path: files.data_file_path,
        data_file_name: files.data_file_name,
        status: 'pending',
      })
      .select('id')
      .single()
    if (orderError || !order) {
      console.error('[store-checkout] order insert failed:', orderError)
      return NextResponse.json({ message: '注文の作成に失敗しました' }, { status: 500 })
    }

    let session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: `${product.title}（${kind === 'data' ? '3D データ' : '完成品'}）`,
                description:
                  kind === 'data'
                    ? `3Dプリント用データ／ダウンロード期限 ${STORE_DOWNLOAD_VALID_DAYS}日`
                    : `${SHIPPING_LEAD_TIME_TEXT}・送料無料`,
                ...(product.image_urls[0] ? { images: [product.image_urls[0]] } : {}),
              },
              unit_amount: price,
            },
            quantity: 1,
          },
        ],
        customer_email: email,
        locale: 'ja',
        expires_at: checkoutExpiresAt(),
        // データだけの購入では住所を聞かない（要らない個人情報を集めない）
        ...(kind === 'print'
          ? {
              shipping_address_collection: { allowed_countries: ['JP' as const] },
              phone_number_collection: { enabled: true },
            }
          : {}),
        success_url: `${STORE_URL}/thanks?order=${order.id}`,
        cancel_url: `${STORE_URL}/p/${product.id}`,
        metadata: { type: 'store_order', order_id: order.id, kind },
      })
    } catch (err) {
      // 決済画面を作れなかった注文は残さない（決済待ちのまま一覧に溜まる）
      await supabaseAdmin.from('store_orders').delete().eq('id', order.id).eq('status', 'pending')
      throw err
    }

    await supabaseAdmin.from('store_orders').update({ stripe_session_id: session.id }).eq('id', order.id)

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[store-checkout] failed:', err)
    return NextResponse.json({ message: '決済の準備に失敗しました' }, { status: 500 })
  }
}
