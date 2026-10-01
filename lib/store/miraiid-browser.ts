import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MIRAIID_SUPABASE_ANON_KEY, MIRAIID_SUPABASE_URL } from './miraiid-config'

/**
 * ブラウザでの MiraiID ログイン用クライアント。
 *
 * ⚠ ここで得たセッションは、サーバーに渡して store_session を発行してもらったら捨てる
 *   （app/store/auth/callback）。ストアの権限判定は store_session だけで行う。
 * ⚠ storageKey を分けておく。既定のキーだと、同じブラウザで他の Supabase を使う
 *   ページと保存場所がぶつかる。
 */
let client: SupabaseClient | null = null

export function miraiidBrowser(): SupabaseClient {
  if (!client) {
    client = createClient(MIRAIID_SUPABASE_URL, MIRAIID_SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'store-miraiid-auth',
      },
    })
  }
  return client
}
