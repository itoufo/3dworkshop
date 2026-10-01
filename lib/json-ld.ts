/**
 * <script type="application/ld+json"> に入れる文字列。
 *
 * ⚠ JSON.stringify は "</script>" をそのまま出す。商品名などにそれが入っていると、
 *   埋め込んだ JSON の途中で script が閉じ、後ろが HTML として解釈される（products は
 *   ブラウザの anon キーで書き換えられるので、外から仕込める）。"<" を < に置き換えて塞ぐ。
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
