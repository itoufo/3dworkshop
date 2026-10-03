-- stl-files バケット（3Dプリント制作依頼の STL）。
--
-- 書き込みは /api/printing-upload-url が発行する署名付きURL経由だけ。anon が直接置ける・一覧できるポリシーは
-- 置かない（20261003_storage_write_policies.sql で外した）。公開バケットなので、URL を知っていれば読める。
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stl-files', 'stl-files', true, 52428800, array['model/stl'])
ON CONFLICT (id) DO UPDATE
  SET public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- workshop-images バケット（ワークショップ・ブログの画像）。
--
-- 書き込みは /api/upload-image（管理者のみ・service role）だけ。anon が置ける・上書きできる・消せるポリシーは置かない。
INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-images', 'workshop-images', true)
ON CONFLICT (id) DO NOTHING;

-- 公開バケットのファイルはポリシーが無くても公開 URL で読める。一覧（list）だけを許す
CREATE POLICY "Allow public downloads for workshop images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'workshop-images');
