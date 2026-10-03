-- 2026-10-03 に本番へ適用済み（psql で直接）。再実行しても同じ状態になる。
-- public.exec_sql(sql_query text) を、公開の anon キーやログインユーザーから呼べないようにする。
--
-- この関数は SECURITY DEFINER（所有者 postgres）で、渡された文字列をそのまま EXECUTE する。
-- EXECUTE 権限が PUBLIC / anon / authenticated に付いているので、ブラウザに配られている anon キーだけで
-- 任意の SQL を postgres 権限で実行できる（RLS もテーブル権限も関係なくなる）。
--
-- ⚠ この関数はこのアプリ（3dworkshop）のものではない。相乗りしている ascend-suite-ai のマイグレーション用
--   （ascend-suite-ai/supabase/migrations/003_add_exec_sql_function.sql、src/lib/migration-runner.ts、
--   src/pages/RunMigration.tsx、supabase/functions/run-sql）。権限を外すと、そちらの「ブラウザから
--   マイグレーションを流す」画面は動かなくなる。service_role からの呼び出し（Edge Function など）は残る。
-- ⚠ 3dworkshop のコードはこの関数を使っていない（grep 0件）。

revoke execute on function public.exec_sql(text) from public, anon, authenticated;
