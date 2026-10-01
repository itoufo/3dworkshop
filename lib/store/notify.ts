import 'server-only'
import { sendEmail } from '@/app/lib/email'
import { MAIN_SITE_URL, STORE_URL } from './urls'

/**
 * ストアのお知らせメール。
 * ⚠ 出品者が書いた文字（表示名・商品名）は必ずエスケープする。HTML メールに混ぜると
 *   管理者宛てのメールに偽のリンクを仕込める。
 * ⚠ 送信に失敗しても申請・審査そのものは成功させる（メールは知らせるだけ）。
 */

/** 出品の申請・審査待ちを知らせる先 */
const STORE_ADMIN_NOTIFY = '3dlab@sunu25.com'
const STORE_ADMIN_CC = ['yuho.ito@walker.co.jp']

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function layout(title: string, body: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.7;">
  <h2 style="color:#7c3aed;">${esc(title)}</h2>
  ${body}
  <p style="color:#6b7280;font-size:13px;margin-top:32px;">3DLab みんなの作品ストア<br>${STORE_URL}</p>
</div>`
}

async function safeSend(to: string, subject: string, html: string, cc?: string[]) {
  try {
    // ⚠ sendEmail は失敗しても例外を投げず { success: false } を返す。見ないと失敗が跡形も残らない
    const result = await sendEmail({ to, subject, html, cc })
    if (!result.success) console.error('[store-notify] send failed:', subject, result.error)
  } catch (err) {
    console.error('[store-notify] send failed:', subject, err)
  }
}

export async function notifyAdminSellerApplied(input: { displayName: string; loginEmail: string; flagged: boolean }) {
  const subject = `【ストア】出品者の申請: ${input.displayName}`
  const html = layout('出品者の申請がありました', `
  <p>表示名: ${esc(input.displayName)}<br>ログインのメール: ${esc(input.loginEmail)}</p>
  ${input.flagged ? '<p style="color:#b91c1c;">⚠ 在籍を Stripe で確かめられませんでした。承認前に本人確認をしてください。</p>' : ''}
  <p><a href="${MAIN_SITE_URL}/admin/store/sellers">管理画面で確認する</a></p>`)
  await safeSend(STORE_ADMIN_NOTIFY, subject, html, STORE_ADMIN_CC)
}

export async function notifyAdminProductSubmitted(input: { title: string; sellerName: string }) {
  const subject = `【ストア】作品の審査依頼: ${input.title}`
  const html = layout('作品の審査依頼がありました', `
  <p>作品: ${esc(input.title)}<br>出品者: ${esc(input.sellerName)}</p>
  <p><a href="${MAIN_SITE_URL}/admin/store/products">管理画面で確認する</a></p>`)
  await safeSend(STORE_ADMIN_NOTIFY, subject, html, STORE_ADMIN_CC)
}

export async function notifySellerReviewed(input: {
  to: string
  kind: 'seller' | 'product'
  approved: boolean
  name: string
  note: string | null
}) {
  const what = input.kind === 'seller' ? '出品者の申請' : `作品「${input.name}」`
  const subject = input.approved ? `${what}が承認されました` : `${what}について`
  const lead = input.approved
    ? input.kind === 'seller'
      ? '出品者として承認されました。出品者メニューから作品を登録できます。'
      : '作品を掲載しました。'
    : input.kind === 'seller'
      ? '今回は出品者として承認できませんでした。'
      : '作品の掲載前に直していただきたい点があります。出品者メニューから修正して、もう一度審査に出してください。'
  const html = layout(subject, `
  <p>${esc(lead)}</p>
  ${input.note ? `<p style="background:#f3f4f6;padding:12px;border-radius:8px;white-space:pre-wrap;">${esc(input.note)}</p>` : ''}
  <p><a href="${STORE_URL}/sell">出品者メニューを開く</a></p>`)
  await safeSend(input.to, subject, html)
}

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`

export interface PaidStoreOrder {
  id: string
  kind: 'data' | 'print'
  price: number
  sellerAmount: number
  productId: string
  productTitle: string
  buyerName: string
  buyerEmail: string
  /** データ購入のときだけ */
  downloadUrl?: string
  downloadValidDays?: number
  downloadMaxCount?: number
  /** 印刷のときだけ。⚠ 出品者宛てには載せない */
  shippingLines?: string[]
  shippingLeadTimeText?: string
  sellerName: string
  sellerEmail: string | null
}

/**
 * 支払いが済んだ注文を、購入者・管理者・出品者に知らせる。
 * ⚠ 出品者には購入者の名前・メール・住所を渡さない（発送は 3DLab がするので要らない）。
 */
export async function notifyStoreOrderPaid(o: PaidStoreOrder) {
  const kindLabel = o.kind === 'data' ? '3D データ' : '完成品'
  const orderNo = o.id.slice(0, 8)

  // 購入者
  {
    const subject = `ご購入ありがとうございます: ${o.productTitle}`
    const body =
      o.kind === 'data'
        ? `<p>${esc(o.buyerName)} 様</p>
  <p>「${esc(o.productTitle)}」の 3D データをご購入いただき、ありがとうございます。下のボタンからダウンロードできます。</p>
  <p style="margin:24px 0;"><a href="${esc(o.downloadUrl ?? '')}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold;">データをダウンロード</a></p>
  <p style="font-size:14px;color:#4b5563;">ダウンロードは ${o.downloadValidDays} 日間・${o.downloadMaxCount} 回までです。このメールは保存しておいてください。<br>
  データはご自身で印刷して楽しむためのものです。再配布・再販売はできません。</p>`
        : `<p>${esc(o.buyerName)} 様</p>
  <p>「${esc(o.productTitle)}」の完成品をご注文いただき、ありがとうございます。3DLab が印刷して、${esc(o.shippingLeadTimeText ?? '')}します。</p>
  ${o.shippingLines?.length ? `<p>お届け先:<br>${o.shippingLines.map(esc).join('<br>')}</p>` : ''}`
    const html = layout('ご購入ありがとうございます', `${body}
  <p>注文番号: ${orderNo}<br>${kindLabel}: ${yen(o.price)}（税込・送料込）</p>
  <p style="font-size:14px;color:#4b5563;">ご不明な点は 3dlab@sunu25.com までお問い合わせください。</p>`)
    await safeSend(o.buyerEmail, subject, html)
  }

  // 管理者（印刷はここから作業が始まる）
  {
    const subject = `【ストア】${o.kind === 'print' ? '印刷の注文' : 'データの販売'}: ${o.productTitle}`
    const html = layout(subject.replace('【ストア】', ''), `
  <p>作品: ${esc(o.productTitle)}<br>出品者: ${esc(o.sellerName)}<br>種類: ${kindLabel}<br>
  価格: ${yen(o.price)}（出品者の取り分 ${yen(o.sellerAmount)}）<br>注文番号: ${orderNo}</p>
  <p>購入者: ${esc(o.buyerName)}（${esc(o.buyerEmail)}）</p>
  ${o.shippingLines?.length ? `<p>お届け先:<br>${o.shippingLines.map(esc).join('<br>')}</p>` : ''}
  <p><a href="${MAIN_SITE_URL}/admin/store/orders">管理画面で注文を見る</a></p>`)
    await safeSend(STORE_ADMIN_NOTIFY, subject, html, STORE_ADMIN_CC)
  }

  // 出品者
  if (o.sellerEmail) {
    const subject = `作品が売れました: ${o.productTitle}`
    const html = layout('作品が売れました', `
  <p>${esc(o.sellerName)} さん</p>
  <p>「${esc(o.productTitle)}」の${kindLabel}が売れました。${o.kind === 'print' ? '印刷と発送は 3DLab が行います。' : ''}</p>
  <p>価格: ${yen(o.price)}<br>あなたの取り分: <strong>${yen(o.sellerAmount)}</strong></p>
  <p><a href="${STORE_URL}/sell">出品者メニューを開く</a></p>`)
    await safeSend(o.sellerEmail, subject, html)
  }
}
