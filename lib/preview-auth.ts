import { createHash } from 'crypto'

// 限定公開ワークショップのプレビュー認証ヘルパー
// パスワード合致時に httpOnly Cookie にトークン（sha256(id:password)）を保存し、
// サーバーコンポーネント側で同じ計算結果と照合する。
// パスワードを変更すると既存 Cookie は自動的に無効になる。

export function previewCookieName(workshopId: string): string {
  return `ws_preview_${workshopId}`
}

export function previewToken(workshopId: string, password: string): string {
  return createHash('sha256').update(`${workshopId}:${password}`).digest('hex')
}
