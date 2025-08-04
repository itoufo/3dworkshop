# データベース更新手順

## 新しいカラムの追加が必要です

Supabaseのダッシュボードで以下のSQLを実行してください：

### 1. Supabaseダッシュボードにログイン
1. https://app.supabase.com にアクセス
2. プロジェクトを選択
3. 左側メニューから「SQL Editor」を選択

### 2. 以下のSQLを実行

```sql
-- Add new columns to workshops table
ALTER TABLE public.workshops
ADD COLUMN IF NOT EXISTS event_date DATE,
ADD COLUMN IF NOT EXISTS event_time TIME,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS rich_description TEXT;

-- Add comments to new columns
COMMENT ON COLUMN public.workshops.event_date IS 'ワークショップ開催日';
COMMENT ON COLUMN public.workshops.event_time IS 'ワークショップ開始時刻';
COMMENT ON COLUMN public.workshops.location IS 'ワークショップ開催場所';
COMMENT ON COLUMN public.workshops.rich_description IS 'リッチテキスト形式の詳細説明';
```

### 3. 実行後の確認
- 「Table Editor」でworkshopsテーブルを確認
- 新しいカラムが追加されていることを確認：
  - event_date (date型)
  - event_time (time型)
  - location (text型)
  - rich_description (text型)

### 追加されるカラムの説明

| カラム名 | 型 | 説明 |
|---------|-----|------|
| event_date | DATE | ワークショップの開催日 |
| event_time | TIME | ワークショップの開始時刻 |
| location | TEXT | 開催場所 |
| rich_description | TEXT | HTMLリッチテキスト形式の詳細説明 |

これらのカラムは全てNULL許可なので、既存のデータに影響はありません。