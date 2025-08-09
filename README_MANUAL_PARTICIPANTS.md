# 参加人数の手動調整機能

## 概要
他の媒体（電話、メール、店頭など）から予約が入った場合に、参加人数を手動で調整できる機能を実装しました。

## データベース変更
以下のSQLをSupabaseのSQL Editorで実行してください：

```sql
-- ワークショップに手動参加人数調整フィールドを追加
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS manual_participants INTEGER DEFAULT 0;

-- 手動参加人数の説明フィールドを追加（他媒体からの予約詳細など）
ALTER TABLE workshops ADD COLUMN IF NOT EXISTS manual_participants_note TEXT;

-- 手動参加人数の更新履歴を記録するテーブルを作成
CREATE TABLE IF NOT EXISTS manual_participants_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
  previous_value INTEGER NOT NULL,
  new_value INTEGER NOT NULL,
  note TEXT,
  updated_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_manual_participants_log_workshop ON manual_participants_log(workshop_id, created_at DESC);

-- 現在の参加人数を計算するビューを作成
CREATE OR REPLACE VIEW workshop_current_participants AS
SELECT 
  w.id,
  w.title,
  w.max_participants,
  w.manual_participants,
  COALESCE(SUM(b.participants), 0) AS booked_participants,
  w.manual_participants + COALESCE(SUM(b.participants), 0) AS total_participants,
  w.max_participants - (w.manual_participants + COALESCE(SUM(b.participants), 0)) AS available_spots
FROM workshops w
LEFT JOIN bookings b ON w.id = b.workshop_id 
  AND b.status != 'cancelled' 
  AND b.payment_status IN ('pending', 'paid')
GROUP BY w.id, w.title, w.max_participants, w.manual_participants;
```

## 機能詳細

### 管理画面での操作
1. 管理画面（/admin）からワークショップの編集画面へ移動
2. 「参加人数の手動調整」セクションで：
   - **手動調整人数**: システム外で受け付けた予約人数を入力
   - **調整理由・メモ**: どこから予約が入ったか記録（例：電話予約3名、店頭受付2名）

### ユーザー画面での表示
- ワークショップ詳細ページで：
  - 残席数が自動的に計算されて表示
  - 手動調整分も含めた正確な残席数を表示
  - 満席の場合は予約フォームが無効化される
  - 他媒体からの予約がある場合はその旨を表示

### 残席計算ロジック
```
総参加人数 = システム上の予約人数 + 手動調整人数
残席数 = 最大参加人数 - 総参加人数
```

## API エンドポイント

### GET /api/check-availability
ワークショップの残席状況を取得

**パラメータ:**
- `workshopId`: ワークショップID

**レスポンス:**
```json
{
  "max_participants": 20,
  "booked_participants": 10,
  "manual_participants": 3,
  "total_participants": 13,
  "available_spots": 7,
  "is_full": false
}
```

## 注意事項
- 手動調整人数を設定する際は、最大参加人数を超えないよう注意してください
- 手動調整の履歴は `manual_participants_log` テーブルに記録されます（将来の拡張用）
- ビュー `workshop_current_participants` を使用すると、全ワークショップの現在の参加状況を一覧で確認できます

## 今後の拡張案
1. 手動調整の履歴表示機能
2. 手動調整時の通知機能
3. 予約ソース別の統計表示
4. キャンセル待ち機能