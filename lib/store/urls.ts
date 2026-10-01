/**
 * ストアと 3dlab.jp の URL。
 *
 * ⚠ ストアのページ内リンクは「/login」のようにストアのホストでの見た目のパスで書く
 *   （/store/login と書かない）。stores.3dlab.jp では next.config.js が /store/* に書き換える。
 * ⚠ ストアから 3dlab.jp のページへは必ず絶対 URL で飛ばす。相対だとストア側に解決される。
 */
export const STORE_URL = 'https://stores.3dlab.jp'
export const MAIN_SITE_URL = 'https://3dlab.jp'

/** 出品資格に要るスクールの在籍期間（月） */
export const SELLER_MIN_ENROLLED_MONTHS = 3
