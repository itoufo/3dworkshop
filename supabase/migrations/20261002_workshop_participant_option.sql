-- 参加者ごとの選択肢（例: ポーリングアートで塗るフィギュアを 持参 / 7cm / 10cm から選ぶ）
--
-- workshops.participant_option:
--   { "label": "フィギュア", "choices": [ { "id": "...", "label": "持参する", "price": 0 }, ... ] }
--   NULL なら選択肢なし（今までどおり）。price は参加費に加える金額（円）。
-- bookings.participant_choices:
--   参加者1人につき1件の控え [ { "id", "label", "price" }, ... ]。
--   名前と金額は予約時点のもの。書くのはサーバー（/api/create-checkout-session）だけ。
--   total_amount はこの合計を含んだ金額になる。
ALTER TABLE workshops
  ADD COLUMN IF NOT EXISTS participant_option jsonb;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS participant_choices jsonb;
