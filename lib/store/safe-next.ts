/**
 * ログイン後に戻る先。ストア内の相対パスだけを通す。
 * ⚠ 外部 URL（//evil.example や https://…）を通すと、ログイン画面を踏み台にした
 *   なりすましページへの誘導に使われる。
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}
