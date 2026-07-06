-- ワークショップの限定公開（パスワード保護プレビュー）機能
-- is_private = true のワークショップは一覧・サイトマップ・公開APIから除外され、
-- URL を知っていてパスワードを入力した人だけが閲覧・予約できる。

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS preview_password text;

COMMENT ON COLUMN public.workshops.is_private IS '限定公開フラグ。true の場合は一覧に表示されず、パスワード入力が必要';
COMMENT ON COLUMN public.workshops.preview_password IS '限定公開ページの閲覧パスワード（is_private = true のとき必須）';
