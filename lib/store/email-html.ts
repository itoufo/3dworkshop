import { STORE_URL } from './urls'

/**
 * ストアのメールの HTML を組み立てる部品（送信はしない）。
 * ⚠ 出品者や購入者が書いた文字（表示名・作品名・お名前・住所）は必ず esc を通す。HTML メールに
 *   そのまま混ぜると、偽のリンクを仕込める。
 */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** メール全体の枠。lang は英語のメールのときだけ渡す（読み上げ・翻訳のため） */
export function layout(title: string, body: string, lang?: 'en'): string {
  return `<div${lang ? ` lang="${lang}"` : ''} style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111827;line-height:1.7;">
  <h2 style="color:#7c3aed;">${esc(title)}</h2>
  ${body}
  <p style="color:#6b7280;font-size:13px;margin-top:32px;">3DLab Store<br>${STORE_URL}</p>
</div>`
}

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`
