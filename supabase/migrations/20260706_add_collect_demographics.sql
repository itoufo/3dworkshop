-- 予約フォームで年齢・性別を収集するかどうかをワークショップごとに選択できるようにする。
-- デフォルトは収集しない（customers.age / gender は null = 不明のまま）。

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS collect_demographics boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workshops.collect_demographics IS '予約時に年齢・性別の入力欄を表示するか。false の場合は不明(null)として扱う';
