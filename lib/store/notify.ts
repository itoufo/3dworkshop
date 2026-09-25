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
    await sendEmail({ to, subject, html, cc })
  } catch (err) {
    console.error('[store-notify] send failed:', subject, err)
  }
}

export async function notifyAdminSellerApplied(input: { displayName: string; loginEmail: string; flagged: boolean }) {
  const subject = `【ストア】出品者の申請: ${input.displayName}`
  const html = layout('出品者の申請がありました', `
  <p>表示名: ${esc(input.displayName)}<br>ログインのメール: ${esc(input.loginEmail)}</p>
  ${input.flagged ? '<p style="color:#b91c1c;">⚠ 在籍を Stripe で確かめられなかったか、メールが一致しません。承認前に確認してください。</p>' : ''}
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
