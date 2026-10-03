import type Stripe from 'stripe'
import { SHIPPING_LEAD_TIME_DAYS, SHIPPING_LEAD_TIME_TEXT } from '@/lib/shipping'
import { STORE_DOWNLOAD_VALID_DAYS } from './download-limits'
import { storePath, type StoreLocale } from './locale'
import { STORE_UI, shippingLeadTimeText } from './ui-copy'
import { STORE_URL } from './urls'

/** Stripe の決済画面に載せる1明細（lib/store/cart-server.ts の ResolvedLine のうち、要るものだけ） */
export interface StoreCheckoutLine {
  kind: 'data' | 'print'
  title: string
  variantLabel: string | null
  imageUrl: string | null
  unitPrice: number
  quantity: number
}

/**
 * ストアの決済で Stripe に渡す内容を組み立てる（app/api/store/cart/checkout から呼ぶ）。
 * ここは値を組み立てるだけで、Stripe も DB も呼ばない（単体で確かめられるように分けてある）。
 *
 * locale が 'en' のとき:
 *   - 決済画面の言語・明細の名前と説明を英語にする
 *   - 決済のあとに戻る先を英語のページ（/en/thanks、/en/cart）にする
 *   - metadata.locale に載せる。支払い後の処理（lib/store/fulfill.ts）がこれを読んで、購入者あての
 *     メールとダウンロードのリンクを英語にする（注文の行には言語を持たせていない）
 * ⚠ 完成品のお届け先は、言語に関係なく日本国内だけ。
 */
export function storeCheckoutSessionParams(input: {
  lines: StoreCheckoutLine[]
  email: string
  checkoutId: string
  locale: StoreLocale
  /** 決済画面の期限（lib/stripe.ts の checkoutExpiresAt） */
  expiresAt: number
}): Stripe.Checkout.SessionCreateParams {
  const { lines, email, checkoutId, locale, expiresAt } = input
  const ui = STORE_UI[locale]
  const hasPrint = lines.some((l) => l.kind === 'print')
  const dataDescription =
    locale === 'en'
      ? `3D print data. Download link valid for ${STORE_DOWNLOAD_VALID_DAYS} days`
      : `3Dプリント用データ／ダウンロード期限 ${STORE_DOWNLOAD_VALID_DAYS}日`
  const printDescription =
    locale === 'en'
      ? `${shippingLeadTimeText('en', SHIPPING_LEAD_TIME_TEXT, SHIPPING_LEAD_TIME_DAYS)}. Free shipping (Japan only)`
      : `${SHIPPING_LEAD_TIME_TEXT}・送料無料`

  return {
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lines.map((l) => ({
      price_data: {
        currency: 'jpy' as const,
        product_data: {
          name: ui.lineName(l.title, l.kind, l.variantLabel),
          description: l.kind === 'data' ? dataDescription : printDescription,
          ...(l.imageUrl ? { images: [l.imageUrl] } : {}),
        },
        unit_amount: l.unitPrice,
      },
      quantity: l.quantity,
    })),
    customer_email: email,
    locale,
    expires_at: expiresAt,
    ...(hasPrint
      ? {
          shipping_address_collection: { allowed_countries: ['JP' as const] },
          phone_number_collection: { enabled: true },
        }
      : {}),
    success_url: `${STORE_URL}${storePath(locale, '/thanks')}?checkout=${checkoutId}`,
    cancel_url: `${STORE_URL}${storePath(locale, '/cart')}`,
    metadata: { type: 'store_cart', checkout_id: checkoutId, locale },
  }
}
