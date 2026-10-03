-- 2026-10-03 に本番へ適用済み（psql で直接）。再実行しても同じ状態になる。
-- 顧客・予約・スクール申込・制作依頼のテーブルを、サーバー（service role）からしか触れないようにする。
--
-- 対象の6テーブルは RLS が無効で、anon / authenticated にテーブル権限が付いていた。
-- 読み書きはすべてサーバー側のルート（service role）へ移してあるので、
-- RLS を有効にしてポリシーを置かず（＝ service role 以外は1行も見えない・書けない）、
-- あわせて anon / authenticated のテーブル権限も外す。
--
-- ⚠ 適用の順番: 読み書きをサーバー経由にしたコードが本番に出てから適用すること。
--   先に適用すると、予約・スクール申込・制作依頼のフォームと管理画面が止まる。
-- ⚠ ポリシーは足さない。足す必要が出たら、まずサーバー側のルートで済まないかを考える。
--   service role は RLS を通らない（rolbypassrls）ので、サーバー側のルートはこのままで動く。
-- ⚠ 対象はこのアプリのテーブルだけに限る。この Supabase プロジェクトは別アプリと相乗りなので、
--   schema 全体への REVOKE はしない。authenticated の権限を外すのも下の6テーブルだけ
--   （相乗り先のアプリはこの6テーブルを使っていない）。
-- ⚠ workshop_current_participants（ビュー）は所有者の権限で bookings を読むので、
--   これまでどおり参加人数の集計だけを返す（行の中身は出さない）。

do $$
declare
  t text;
  targets text[] := array[
    'customers',
    'bookings',
    'school_enrollments',
    'printing_orders',
    'printing_history',
    'manual_participants_log'
  ];
begin
  foreach t in array targets loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('revoke all on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;
