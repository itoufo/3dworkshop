-- Supabase Storage バケットの作成
-- Supabase DashboardのSQL Editorで実行してください

-- ワークショップ画像用のバケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('workshop-images', 'workshop-images', true)
ON CONFLICT (id) DO NOTHING;

-- 画像アップロードのポリシーを設定
-- 認証ユーザーのみアップロード可能
CREATE POLICY "Authenticated users can upload workshop images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'workshop-images' AND auth.role() = 'authenticated');

-- 誰でも画像を閲覧可能
CREATE POLICY "Anyone can view workshop images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'workshop-images');

-- 認証ユーザーは画像を削除可能
CREATE POLICY "Authenticated users can delete workshop images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'workshop-images' AND auth.role() = 'authenticated');

-- 認証ユーザーは画像を更新可能
CREATE POLICY "Authenticated users can update workshop images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'workshop-images' AND auth.role() = 'authenticated');