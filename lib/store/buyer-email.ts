import { SHIPPING_LEAD_TIME_DAYS } from '@/lib/shipping'
import { esc, layout, yen } from './email-html'
import type { StoreLocale } from './locale'
import { STORE_UI, shippingLeadTimeText } from './ui-copy'

export interface PaidStoreLine {
  kind: 'data' | 'print'
  title: string
  variantLabel: string | null
  quantity: number
  /** 1個の価格 */
  price: number
  /** この行の出品者の取り分（数量込み） */
  sellerAmount: number
  sellerName: string
  sellerEmail: string | null
  /** データのときだけ */
  downloadUrl?: string
}

export interface PaidStoreCheckout {
  /** メールに出す注文番号 */
  orderNo: string
  /** 購入者が買ったときの言語。購入者あてのメールだけがこれで変わる（管理者・出品者あては常に日本語） */
  locale: StoreLocale
  buyerName: string
  buyerEmail: string
  lines: PaidStoreLine[]
  /** 完成品があるときだけ。管理者あての書き方（日本語）。⚠ 出品者宛てには載せない */
  shippingLines: string[]
  /** 完成品があるときだけ。購入者あての書き方（購入者の言語） */
  buyerShippingLines: string[]
  shippingLeadTimeText: string
  downloadValidDays: number
  downloadMaxCount: number
}

/** 「作品名（買い方・組み合わせ）」。管理者・出品者あては日本語で呼ぶ */
export function storeLineName(l: PaidStoreLine, locale: StoreLocale = 'ja'): string {
  if (locale === 'en') return STORE_UI.en.lineName(l.title, l.kind, l.variantLabel)
  const kind = l.kind === 'data' ? '3D データ' : '完成品'
  return `${l.title}（${kind}${l.variantLabel ? `・${l.variantLabel}` : ''}）`
}

export function storeLineRow(l: PaidStoreLine, locale: StoreLocale = 'ja'): string {
  return `<li>${esc(storeLineName(l, locale))} × ${l.quantity} … ${yen(l.price * l.quantity)}</li>`
}

/** 件名に出す品名（2点以上なら「ほかN点」） */
export function storeSubjectItems(c: Pick<PaidStoreCheckout, 'lines'>, locale: StoreLocale = 'ja'): string {
  const first = storeLineName(c.lines[0], locale)
  if (c.lines.length <= 1) return first
  return locale === 'en' ? `${first} and ${c.lines.length - 1} more` : `${first} ほか${c.lines.length - 1}点`
}

const BUTTON_STYLE =
  'display:inline-block;margin-top:8px;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold;'

/**
 * 購入者あての「ご購入ありがとうございます」メール（件名と HTML）。送信はしない。
 * データを買った人には、ここに載せるボタンがダウンロードの唯一の入口になる
 * （決済後のページにはリンクを出さない）。
 */
export function storeBuyerPaidEmail(c: PaidStoreCheckout): { subject: string; html: string } {
  const total = c.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const dataLines = c.lines.filter((l) => l.kind === 'data')
  const hasPrint = c.lines.some((l) => l.kind === 'print')

  if (c.locale === 'en') {
    const downloads = dataLines.length
      ? `<p>You can download the 3D data with the ${dataLines.length > 1 ? 'buttons' : 'button'} below (for ${c.downloadValidDays} days, up to ${c.downloadMaxCount} times). Please keep this email.</p>
  ${dataLines
    .map(
      (l) => `<p style="margin:16px 0;">${esc(storeLineName(l, 'en'))}<br><a href="${esc(l.downloadUrl ?? '')}" style="${BUTTON_STYLE}">Download the data</a></p>`,
    )
    .join('')}
  <p style="font-size:14px;color:#4b5563;">The data is for printing and enjoying yourself. You may not redistribute or resell it.</p>`
      : ''
    const leadTime = shippingLeadTimeText('en', c.shippingLeadTimeText, SHIPPING_LEAD_TIME_DAYS)
    const shipping = hasPrint
      ? `<p>3DLab prints the finished print for you. ${esc(leadTime)}.</p>
  ${c.buyerShippingLines.length ? `<p>Ship to:<br>${c.buyerShippingLines.map(esc).join('<br>')}</p>` : ''}`
      : ''
    const html = layout(
      'Thank you for your purchase',
      `<p>Dear ${esc(c.buyerName)},</p>
  <p>Thank you for your purchase.</p>
  <ul>${c.lines.map((l) => storeLineRow(l, 'en')).join('')}</ul>
  <p>Total ${yen(total)} (tax and shipping included)<br>Order number: ${esc(c.orderNo)}</p>
  ${downloads}
  ${shipping}
  <p style="font-size:14px;color:#4b5563;">If you have any questions, please contact us at 3dlab@sunu25.com.</p>`,
      'en',
    )
    return { subject: `Thank you for your purchase: ${storeSubjectItems(c, 'en')}`, html }
  }

  const downloads = dataLines.length
    ? `<p>3D データは下のボタンからダウンロードできます（${c.downloadValidDays}日間・${c.downloadMaxCount}回まで）。このメールは保存しておいてください。</p>
  ${dataLines
    .map(
      (l) => `<p style="margin:16px 0;">${esc(storeLineName(l))}<br><a href="${esc(l.downloadUrl ?? '')}" style="${BUTTON_STYLE}">データをダウンロード</a></p>`,
    )
    .join('')}
  <p style="font-size:14px;color:#4b5563;">データはご自身で印刷して楽しむためのものです。再配布・再販売はできません。</p>`
    : ''
  const shipping = hasPrint
    ? `<p>完成品は 3DLab が印刷して、${esc(c.shippingLeadTimeText)}します。</p>
  ${c.buyerShippingLines.length ? `<p>お届け先:<br>${c.buyerShippingLines.map(esc).join('<br>')}</p>` : ''}`
    : ''
  const html = layout('ご購入ありがとうございます', `<p>${esc(c.buyerName)} 様</p>
  <p>ご購入いただき、ありがとうございます。</p>
  <ul>${c.lines.map((l) => storeLineRow(l)).join('')}</ul>
  <p>合計 ${yen(total)}（税込・送料込）<br>注文番号: ${esc(c.orderNo)}</p>
  ${downloads}
  ${shipping}
  <p style="font-size:14px;color:#4b5563;">ご不明な点は 3dlab@sunu25.com までお問い合わせください。</p>`)
  return { subject: `ご購入ありがとうございます: ${storeSubjectItems(c)}`, html }
}
