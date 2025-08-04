# データベース更新手順

## 新しいカラムの追加が必要です

Supabaseのダッシュボードで以下のSQLを実行してください：

### 1. Supabaseダッシュボードにログイン
1. https://app.supabase.com にアクセス
2. プロジェクトを選択
3. 左側メニューから「SQL Editor」を選択

### 2. 以下のSQLを実行

#### ワークショップテーブルの更新
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

#### 顧客テーブルの更新
```sql
-- Add age and gender columns to customers table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20);

-- Add comments to new columns
COMMENT ON COLUMN public.customers.age IS '顧客の年齢';
COMMENT ON COLUMN public.customers.gender IS '顧客の性別 (male/female/other/prefer_not_to_say)';

-- Add check constraint for age (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_age') THEN
    ALTER TABLE public.customers
    ADD CONSTRAINT check_age CHECK (age >= 0 AND age <= 150);
  END IF;
END $$;

-- Add check constraint for gender (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_gender') THEN
    ALTER TABLE public.customers
    ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
  END IF;
END $$;
```

### 3. RLS（Row Level Security）ポリシーの設定

**重要: ワークショップが表示されない場合は、このSQLも実行してください**

```sql
-- Enable RLS on workshops table
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public read access to workshops" ON public.workshops;
DROP POLICY IF EXISTS "Allow all operations for workshops" ON public.workshops;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access to workshops" 
ON public.workshops 
FOR SELECT 
TO public 
USING (true);

-- Create policy to allow all operations (for development)
CREATE POLICY "Allow all operations for workshops" 
ON public.workshops 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Similarly for customers and bookings tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for customers and bookings (for development)
DROP POLICY IF EXISTS "Allow all operations for customers" ON public.customers;
DROP POLICY IF EXISTS "Allow all operations for bookings" ON public.bookings;

CREATE POLICY "Allow all operations for customers" 
ON public.customers 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations for bookings" 
ON public.bookings 
FOR ALL 
TO public 
USING (true)
WITH CHECK (true);
```

### 4. 実行後の確認
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