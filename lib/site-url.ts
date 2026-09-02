/**
 * メールや Webhook から使う、サイトの正式な URL。
 *
 * ⚠ NEXT_PUBLIC_APP_URL をそのまま使わないこと。
 *   このリポジトリの .env ではローカル開発用に http://localhost:3000 が入っている。
 *   本番の環境変数が未設定のままだと、購入メールのダウンロードリンクが
 *   localhost を指して誰も開けない状態になる。
 *   そのため https:// で始まる値だけを上書きとして認め、それ以外は正式ドメインに落とす。
 */
const CANONICAL = 'https://3dlab.jp'

export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured && configured.startsWith('https://')) {
    return configured.replace(/\/+$/, '')
  }
  return CANONICAL
}
