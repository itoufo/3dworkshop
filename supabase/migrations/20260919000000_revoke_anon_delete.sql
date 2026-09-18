-- anon ロールから DELETE / TRUNCATE を剥がす。
--
-- 背景: このプロジェクトのテーブルは RLS が無効（もしくは USING(true) の全開ポリシー）で、
-- anon に SELECT/INSERT/UPDATE/DELETE/TRUNCATE が付いていた。anon キーは
-- NEXT_PUBLIC_SUPABASE_ANON_KEY としてブラウザに配られている公開値なので、
-- 誰でもワークショップ・商品・ブログ記事・顧客・予約を全削除できる状態だった。
--
-- 根本原因は管理画面が client component から anon キーで直接 Supabase を叩いていること。
-- 全部を一度に直すのは大きいので、まず「消される」経路だけを塞ぐ。
-- 削除は service role を使うサーバー経路（app/api/admin/*/[id], lib/admin-delete.ts）に
-- 移してあるので、anon から DELETE を剥がしても管理画面は動く。
--
-- ⚠ authenticated ロールには触らない。この Supabase プロジェクトは別アプリと相乗りで、
--   そちらのユーザーが authenticated として動いている。
-- ⚠ 対象はこのアプリのテーブルだけに限る。schema 全体へ流すと相乗り先を壊す。
--
-- 残っている露出（別途対処）:
--   - anon の SELECT: customers / bookings が誰でも読める（顧客のメールアドレス）
--   - anon の INSERT/UPDATE: 予約・スクール申込・制作依頼の3フローと管理画面のCRUDが依存
--   詳細と段取りは 2026-09-19 の調査を参照。

do $$
declare
  t text;
  targets text[] := array[
    'blog_posts', 'bookings', 'conversation_messages', 'conversation_threads',
    'coupon_usage', 'coupons', 'cumulative_profiles', 'customer_auth_tokens', 'customers',
    'cutter_designs', 'cutter_orders', 'event_platform_posts', 'instagram_posts',
    'manual_participants_log', 'portfolio_items', 'printing_history', 'printing_orders',
    'product_orders', 'products', 'push_notification_log', 'push_subscriptions',
    'school_enrollments', 'service_orders', 'service_requests', 'services',
    'support_tickets', 'surveys', 'workshop_categories', 'workshop_requests',
    'workshop_sessions', 'workshops'
  ];
begin
  foreach t in array targets loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('revoke delete, truncate on public.%I from anon', t);
    end if;
  end loop;
end $$;
