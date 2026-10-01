-- 英語ページ（/en）専用の文言。日本語ページの title / description / consent_text とは別に持つ。
-- ⚠ 共有の列に英語を入れると、同じワークショップの日本語ページ（一覧・詳細・同意書）まで英語になる。
--   /en は title_en ?? title、description_en ?? description、consent_text_en ?? 英語の既定同意書 で表示する
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS consent_text_en text;
