/**
 * MiraiID（mirai-id.net）の Supabase プロジェクト。ストアのログインはここで行う。
 *
 * ⚠ 3dlab の Supabase（lib/supabase.ts）とは別プロジェクト。混ぜないこと。
 *   3dlab 側の auth.users は別アプリと相乗りで、ログインした人に他アプリの表を
 *   消せる権限が付くため使わない（lib/customer-auth.ts に経緯）。
 * ⚠ どちらも公開してよい値（URL と anon キー）。ブラウザでログイン画面を出すのに要る。
 */
export const MIRAIID_SUPABASE_URL = (process.env.NEXT_PUBLIC_MIRAIID_SUPABASE_URL || '').replace(/\/+$/, '')
export const MIRAIID_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_MIRAIID_SUPABASE_ANON_KEY || ''

/** MiraiID の新規登録ページ。登録はストア側では受けない（認証メールの差出人設定を増やさないため） */
export const MIRAIID_SIGNUP_URL = 'https://mirai-id.net/signup'

export function miraiidConfigured(): boolean {
  return !!MIRAIID_SUPABASE_URL && !!MIRAIID_SUPABASE_ANON_KEY
}
