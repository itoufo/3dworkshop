-- 「親子向け」カテゴリを通常カテゴリへ統合し、親子向けは日程フラグ（is_family_friendly）で表現する。
-- 対象: family-ai3d-printer-original-work（4件, すべて過去日程）→ ai3d-printer-original-work-workshop へ統合。
-- slug 基準で書き、id ハードコードに依存しない。冪等（再実行しても安全）。

-- 1) family カテゴリのワークショップを通常カテゴリへ付け替え
UPDATE workshops
SET category_id = (SELECT id FROM workshop_categories WHERE slug = 'ai3d-printer-original-work-workshop')
WHERE category_id = (SELECT id FROM workshop_categories WHERE slug = 'family-ai3d-printer-original-work');

-- 2) 「親子向け」タイトルのワークショップの日程を親子向けフラグに（統合したものをラベル化）
UPDATE workshop_sessions
SET is_family_friendly = true
WHERE workshop_id IN (SELECT id FROM workshops WHERE title LIKE '%親子向け%');

-- 3) 空になった family カテゴリを削除（手順1で移動済みのため孤児化しない）
DELETE FROM workshop_categories
WHERE slug = 'family-ai3d-printer-original-work';
