-- 2026-10-03 に本番へ適用済み（psql で直接）。再実行しても同じ状態になる。
-- 公開コンテンツ用のテーブルを「anon は公開中の行を読むだけ」にする。
--
-- これまで: RLS が無効、または USING (true) の全開ポリシーで、anon に INSERT / UPDATE が付いていた。
--   管理画面（client component）が anon キーで直接書いていたため。
-- これから: 管理画面の読み書きは /api/admin/*（service role）へ移してあるので、
--   anon / authenticated には「公開中の行の SELECT」だけを残す。書き込みと、非公開の行の読み取りは
--   service role（サーバー側のルート）だけができる。
--
-- ⚠ 適用の順番: 管理画面を /api/admin/* 経由にしたコードが本番に出てから適用すること。
--   先に適用すると、管理画面の保存が何も言わずに効かなくなる（RLS は0件更新でもエラーを出さない）。
-- ⚠ 対象はこのアプリのテーブルだけに限る。この Supabase プロジェクトは別アプリと相乗りなので、
--   schema 全体への REVOKE / ポリシー変更はしない。
-- ⚠ service role は RLS を通らない（rolbypassrls）。サーバー側のルートはこのままで動く。

-- ---------------------------------------------------------------------------
-- 1. 公開中の行だけ読めるテーブル
-- ---------------------------------------------------------------------------

-- ワークショップ: 限定公開（is_private）の行は anon から見えない。
--   限定公開の行にだけ意味のある preview_password も、行ごと見えなくなる。
alter table public.workshops enable row level security;
drop policy if exists workshops_public_read on public.workshops;
create policy workshops_public_read on public.workshops
  for select to anon, authenticated
  using (is_private = false);

-- 開催日程: 見えるワークショップの日程だけ見える（限定公開ワークショップの日程は見えない）。
--   サブクエリの workshops にも呼び出した役割の RLS が掛かるので、上のポリシーに連動する。
drop policy if exists workshop_sessions_all on public.workshop_sessions;
drop policy if exists workshop_sessions_select_all on public.workshop_sessions;
drop policy if exists workshop_sessions_public_read on public.workshop_sessions;
create policy workshop_sessions_public_read on public.workshop_sessions
  for select to anon, authenticated
  using (exists (select 1 from public.workshops w where w.id = workshop_sessions.workshop_id));

-- ブログ: 公開済みで、公開日時を過ぎた記事だけ（下書きと予約公開前の記事は見えない）。
--   サイト側の取得（lib/blog.ts）と同じ条件。
alter table public.blog_posts enable row level security;
drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  for select to anon, authenticated
  using (is_published = true and published_at <= now());

-- ---------------------------------------------------------------------------
-- 2. 全行を読めるテーブル（中身がすべて公開情報。書き込みだけ止める）
-- ---------------------------------------------------------------------------

-- カテゴリ
drop policy if exists workshop_categories_insert_all on public.workshop_categories;
drop policy if exists workshop_categories_update_all on public.workshop_categories;
drop policy if exists workshop_categories_delete_all on public.workshop_categories;
-- （workshop_categories_select_all = SELECT USING (true) は残す）

-- 商品: 非公開（is_active = false）の行も読めるままにする。カートが「販売を終了した商品」を
--   区別して表示するのに使っている。価格などは公開ページに出る内容と同じ。
alter table public.products enable row level security;
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated
  using (true);

-- 法人向けサービス
drop policy if exists services_all on public.services;
-- （services_select_all = SELECT USING (true) は残す）

-- 制作事例
alter table public.portfolio_items enable row level security;
drop policy if exists portfolio_items_public_read on public.portfolio_items;
create policy portfolio_items_public_read on public.portfolio_items
  for select to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. anon からは一切触らせないテーブル（サーバー側のルートだけが使う）
-- ---------------------------------------------------------------------------

-- クーポン: コードの一覧を読ませない。検証は /api/validate-coupon（service role）が行う
drop policy if exists "Allow all operations for coupons (admin)" on public.coupons;
drop policy if exists "Allow public read access to active coupons" on public.coupons;
drop policy if exists "Allow all operations for coupon_usage" on public.coupon_usage;

-- 注文・問い合わせ: 受け付けはサーバー側のルートが service role で書く。anon の直接 INSERT は要らない
drop policy if exists product_orders_insert_public on public.product_orders;
drop policy if exists service_orders_insert_public on public.service_orders;
drop policy if exists service_requests_insert_public on public.service_requests;
drop policy if exists workshop_requests_insert_public on public.workshop_requests;

-- イベント媒体への掲載記録・Instagram 投稿の記録（スクリプトが service role で書く）
alter table public.event_platform_posts enable row level security;
alter table public.instagram_posts enable row level security;

-- ---------------------------------------------------------------------------
-- 4. テーブル権限をポリシーに合わせる
--    RLS だけでも止まるが、権限も外しておく（ポリシーを足し間違えたときの二重の止め）
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  -- 公開中の行を読ませるテーブル: SELECT だけ残す
  readable text[] := array[
    'workshops', 'workshop_sessions', 'workshop_categories', 'blog_posts',
    'products', 'product_series', 'services', 'portfolio_items', 'surveys'
  ];
  -- anon からは一切触らせないテーブル
  server_only text[] := array[
    'coupons', 'coupon_usage',
    'product_orders', 'service_orders', 'service_requests', 'workshop_requests',
    'event_platform_posts', 'instagram_posts',
    'customer_auth_tokens', 'cutter_designs', 'cutter_orders',
    'push_notification_log', 'push_subscriptions', 'support_tickets'
  ];
begin
  foreach t in array readable loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('revoke all on public.%I from anon, authenticated', t);
      execute format('grant select on public.%I to anon, authenticated', t);
    end if;
  end loop;
  foreach t in array server_only loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
