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
  buyerName: string
  buyerEmail: string
  lines: PaidStoreLine[]
  /** 完成品があるときだけ。⚠ 出品者宛てには載せない */
  shippingLines: string[]
  shippingLeadTimeText: string
  downloadValidDays: number
  downloadMaxCount: number
}

function lineName(l: PaidStoreLine): string {
  const kind = l.kind === 'data' ? '3D データ' : '完成品'
  return `${l.title}（${kind}${l.variantLabel ? `・${l.variantLabel}` : ''}）`
}

function lineRow(l: PaidStoreLine): string {
  return `<li>${esc(lineName(l))} × ${l.quantity} … ${yen(l.price * l.quantity)}</li>`
}

/**
 * 支払いが済んだ決済（1点でもカートでも）を、購入者・管理者・出品者に知らせる。
 * 購入者と管理者には1通ずつ、出品者には自分の作品の行だけを1通ずつ。
 * ⚠ 出品者には購入者の名前・メール・住所を渡さない（発送は 3DLab がするので要らない）。
 */
export async function notifyStoreCheckoutPaid(c: PaidStoreCheckout) {
  const total = c.lines.reduce((sum, l) => sum + l.price * l.quantity, 0)
  const dataLines = c.lines.filter((l) => l.kind === 'data')
  const hasPrint = c.lines.some((l) => l.kind === 'print')
  const first = lineName(c.lines[0])
  const subjectItems = c.lines.length > 1 ? `${first} ほか${c.lines.length - 1}点` : first

  // 購入者
  {
    const downloads = dataLines.length
      ? `<p>3D データは下のボタンからダウンロードできます（${c.downloadValidDays}日間・${c.downloadMaxCount}回まで）。このメールは保存しておいてください。</p>
  ${dataLines
    .map(
      (l) => `<p style="margin:16px 0;">${esc(lineName(l))}<br><a href="${esc(l.downloadUrl ?? '')}" style="display:inline-block;margin-top:8px;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:bold;">データをダウンロード</a></p>`,
    )
    .join('')}
  <p style="font-size:14px;color:#4b5563;">データはご自身で印刷して楽しむためのものです。再配布・再販売はできません。</p>`
      : ''
    const shipping = hasPrint
      ? `<p>完成品は 3DLab が印刷して、${esc(c.shippingLeadTimeText)}します。</p>
  ${c.shippingLines.length ? `<p>お届け先:<br>${c.shippingLines.map(esc).join('<br>')}</p>` : ''}`
      : ''
    const html = layout('ご購入ありがとうございます', `<p>${esc(c.buyerName)} 様</p>
  <p>ご購入いただき、ありがとうございます。</p>
  <ul>${c.lines.map(lineRow).join('')}</ul>
  <p>合計 ${yen(total)}（税込・送料込）<br>注文番号: ${esc(c.orderNo)}</p>
  ${downloads}
  ${shipping}
  <p style="font-size:14px;color:#4b5563;">ご不明な点は 3dlab@sunu25.com までお問い合わせください。</p>`)
    await safeSend(c.buyerEmail, `ご購入ありがとうございます: ${subjectItems}`, html)
  }

  // 管理者（完成品はここから作業が始まる）
  {
    const subject = `【ストア】${hasPrint ? '印刷の注文' : 'データの販売'}: ${subjectItems}`
    const html = layout(subject.replace('【ストア】', ''), `
  <ul>${c.lines
    .map((l) => `<li>${esc(lineName(l))} × ${l.quantity} … ${yen(l.price * l.quantity)}（出品者 ${esc(l.sellerName)}・取り分 ${yen(l.sellerAmount)}）</li>`)
    .join('')}</ul>
  <p>合計 ${yen(total)}<br>注文番号: ${esc(c.orderNo)}</p>
  <p>購入者: ${esc(c.buyerName)}（${esc(c.buyerEmail)}）</p>
  ${c.shippingLines.length ? `<p>お届け先:<br>${c.shippingLines.map(esc).join('<br>')}</p>` : ''}
  <p><a href="${MAIN_SITE_URL}/admin/store/orders">管理画面で注文を見る</a></p>`)
    await safeSend(STORE_ADMIN_NOTIFY, subject, html, STORE_ADMIN_CC)
  }

  // 出品者（自分の作品の行だけ）
  const bySeller = new Map<string, PaidStoreLine[]>()
  for (const l of c.lines) {
    if (!l.sellerEmail) continue
    bySeller.set(l.sellerEmail, [...(bySeller.get(l.sellerEmail) ?? []), l])
  }
  for (const [email, lines] of bySeller) {
    const amount = lines.reduce((sum, l) => sum + l.sellerAmount, 0)
    const html = layout('作品が売れました', `
  <p>${esc(lines[0].sellerName)} さん</p>
  <p>次の作品が売れました。${lines.some((l) => l.kind === 'print') ? '完成品の印刷と発送は 3DLab が行います。' : ''}</p>
  <ul>${lines.map(lineRow).join('')}</ul>
  <p>あなたの取り分: <strong>${yen(amount)}</strong></p>
  <p><a href="${STORE_URL}/sell">出品者メニューを開く</a></p>`)
    await safeSend(email, `作品が売れました: ${lineName(lines[0])}${lines.length > 1 ? ` ほか${lines.length - 1}点` : ''}`, html)
  }
}

/** 払われたのに注文の行が無い決済（決済画面を作ったあと、行を入れる前に止まった）。返金か手入力が要る */
export async function notifyAdminOrphanPayment(sessionId: string, buyerEmail: string | null) {
  const subject = '【ストア】注文の無い支払いがありました（要確認）'
  const html = layout('注文の無い支払いがありました', `
  <p>Stripe で支払いが完了しましたが、ストアの注文の記録がありません。Stripe の管理画面で内容を確かめ、返金するか注文を手で記録してください。</p>
  <p>Stripe の決済画面 ID: ${esc(sessionId)}<br>購入者のメール: ${esc(buyerEmail ?? '不明')}</p>`)
  await safeSend(STORE_ADMIN_NOTIFY, subject, html, STORE_ADMIN_CC)
}
