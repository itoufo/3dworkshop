-- event_platform_posts の platform CHECK に connpass が入っていなかった。
--
-- ⚠ これは静かに壊れる形の不具合だった:
--   scripts/event-posting の PLATFORM_NAMES には connpass があり、CLI からも投稿できる。
--   しかし投稿後の状態記録（state-tracker の upsert）が CHECK 違反で弾かれ、
--   そのエラーを state-tracker が捨てていたため、
--     「投稿は成功 → 記録は失敗 → 次回また未投稿と判定 → 同じイベントを再投稿」
--   が無限に続く。外部の公開イベントが重複して並ぶ実害になる。
--   （2026-08-31 のレビューで指摘。state-tracker 側もエラーを見るように直した）
--
-- 20260319 の CHECK を作り直す。列やデータは変えない。

ALTER TABLE public.event_platform_posts
  DROP CONSTRAINT IF EXISTS event_platform_posts_platform_check;

ALTER TABLE public.event_platform_posts
  ADD CONSTRAINT event_platform_posts_platform_check
  CHECK (platform IN ('street-academy', 'aini', 'kokuchpro', 'peatix', 'ikoyo', 'connpass'));

-- ⚠ 対応プラットフォームを増やすときは、ここと
--   scripts/event-posting/core/types.ts の PLATFORM_NAMES の両方を直すこと。
--   片方だけだと、また同じ「投稿できるのに記録できない」状態になる。
