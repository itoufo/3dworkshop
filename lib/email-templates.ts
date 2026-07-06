// 予約完了メールの「作品制作について」デフォルト文言（1行 = 1項目）
// カテゴリの email_production_notes が未設定の場合にこの文言が使われる。
// クライアント（管理画面）からも import するため nodemailer に依存させないこと。
export const DEFAULT_PRODUCTION_NOTES = `制作いただく作品は、指定のサイズ・色の範囲内でのオリジナル制作となります。あらかじめご了承ください。
サイズ: 最大10cm四方
色: 白
細かい文字や繊細なデザインは、再現が難しい場合がございます
サイズや仕上がりには多少の誤差が生じる可能性がございます`

// テンプレート文字列を <li> 用の行配列に変換する
export function productionNotesToLines(notes?: string | null): string[] {
  const source = notes?.trim() ? notes : DEFAULT_PRODUCTION_NOTES
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
