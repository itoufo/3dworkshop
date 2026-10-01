-- 英語ページ（/en）に載せるワークショップの印。既定は載せない
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS show_on_english_site BOOLEAN NOT NULL DEFAULT false;
