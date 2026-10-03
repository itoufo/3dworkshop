-- 2026-10-03 に本番へ適用済み（psql で直接）。再実行しても同じ状態になる。
-- Storage の「誰でも書ける」許可を外す。
--
-- workshop-images と stl-files には、anon でもファイルを置ける（workshop-images は上書き・削除もできる）
-- ポリシーが付いていた。公開の anon キーはブラウザに配られているので、サイトに出ている画像を
-- 誰でも差し替え・削除でき、任意のファイルを公開バケットに置けた。
--
-- 書き込みはサーバー経由に寄せてある:
--   workshop-images … /api/upload-image（管理者のみ。service role で置く）
--   stl-files       … /api/printing-upload-url が発行する署名付きURL（1ファイルぶんの許可証）
-- 署名付きURLでのアップロードと service role は RLS を通らないので、ポリシーは要らない。
--
-- ⚠ 適用の順番: 上の2つのルートを使うコードが本番に出てから適用すること。
--   先に適用すると、制作依頼フォームの STL アップロードが失敗する。
-- ⚠ 公開バケットのファイルは、ポリシーが無くても公開 URL で読める。読み取りには影響しない。
--   stl-files の SELECT ポリシーを外すのは、お客さまが上げたファイルの一覧（ファイル名）を
--   API から取れないようにするため。
-- ⚠ chat-images / chat-videos のポリシーには触らない（このアプリのバケットではない）。

drop policy if exists "Allow public uploads for stl" on storage.objects;
drop policy if exists "Allow public downloads for stl" on storage.objects;

drop policy if exists "Allow public uploads for workshop images" on storage.objects;
drop policy if exists "Allow public update for workshop images" on storage.objects;
drop policy if exists "Allow public delete for workshop images" on storage.objects;

-- stl-files に置けるものを、50MB までの STL（種別 model/stl）だけにする。
-- 署名付きURLが許可するのは「この場所に1つ置いてよい」だけで、大きさと種別は発行時に縛れない
-- （/api/printing-upload-url が見ている size は申告値）。実際に強制するのはバケットのこの設定。
-- ⚠ 制作依頼フォームが種別を model/stl に固定して送るようになってから適用すること。
--   それより前の画面は、ブラウザが付けた種別（空など）で送るので弾かれる。
update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['model/stl']
 where id = 'stl-files';
