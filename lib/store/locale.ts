/**
 * ストアの言語。英語のページは /en 以下（app/store/en）にある。
 * ⚠ 英語があるのは hasEnglishPage に当てはまるページだけ（トップ・作品・カート・購入完了・ダウンロード）。
 *   出品者のページ・ログイン・出品者メニューは日本語だけ。
 * ⚠ 'server-only' を付けない。ブラウザ側の部品（StoreLocale.tsx など）からも読む。
 */
export type StoreLocale = 'ja' | 'en'

/** 外から来た値（リクエストの本文・Stripe の metadata）を言語にする。'en' 以外はすべて日本語として扱う */
export function storeLocaleOf(value: unknown): StoreLocale {
  return value === 'en' ? 'en' : 'ja'
}

/**
 * ストアのホストでの見た目のパス（/p/xxx）を、その言語のパスにする（英語なら /en/p/xxx）。
 * ⚠ 渡すのは日本語のパス。すでに /en が付いたパスを渡さない（/en/en/... になる）。
 */
export function storePath(locale: StoreLocale, path: string): string {
  if (locale === 'ja') return path
  return path === '/' ? '/en' : `/en${path}`
}

/** 英語版があるページか（日本語のパスで判定する） */
export function hasEnglishPage(path: string): boolean {
  return /^\/(p\/[0-9a-f-]{36}|cart|thanks|download)?$/i.test(path)
}
