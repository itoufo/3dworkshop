/**
 * ログイン後に戻る先。ストア内のパスだけを通す。
 * ⚠ 外部 URL を通すと、ログイン画面を踏み台にしたなりすましページへの誘導に使われる。
 *   先頭の文字だけで判定しないこと。ブラウザは URL を解釈するときにタブや改行を
 *   読み飛ばすので、`/\t/evil.example` は `//evil.example`（外部）として開かれる。
 *   実際に URL として解釈させ、同じオリジンに留まるかで判定する。
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/')) return '/'
  const base = 'https://stores.invalid'
  let url: URL
  try {
    url = new URL(value, base)
  } catch {
    return '/'
  }
  if (url.origin !== base) return '/'
  return `${url.pathname}${url.search}${url.hash}`
}
