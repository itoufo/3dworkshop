---
description: 3D Labのワークショップをconnpassに自動投稿する
---

# connpass イベント投稿

3D Labの未来のワークショップをconnpassに自動掲載します。

## 使用方法

```bash
/connpass-post [options]
```

## 実行手順

### 1. 環境変数を確認

```bash
# .env に以下が設定されていること
CONNPASS_EMAIL=your_connpass_email
CONNPASS_PASSWORD=your_connpass_password
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://3dlab.jp
```

### 2. 投稿状況を確認（ドライラン）

まず何が投稿されるか確認:

```bash
npx tsx scripts/event-posting/cli.ts post --platform connpass --dry-run
```

### 3. ブラウザ表示モードで初回テスト

初回はセレクタの確認が必要なため、`--headed` で実行:

```bash
npx tsx scripts/event-posting/cli.ts post --platform connpass --headed
```

### 4. 通常実行（ヘッドレス）

```bash
npx tsx scripts/event-posting/cli.ts post --platform connpass
```

### 5. 特定のワークショップのみ投稿

```bash
npx tsx scripts/event-posting/cli.ts post --platform connpass --workshop <workshop-id>
```

## セレクタ確認（discover モード）

connpassのUIが変更された場合、discoverモードでセレクタを確認:

```bash
npx tsx scripts/event-posting/cli.ts discover --platform connpass
```

ブラウザが開くので、DevToolsでセレクタを確認し `platforms/connpass.ts` を更新してください。

## 投稿状況の確認

```bash
npx tsx scripts/event-posting/cli.ts status --platform connpass
```

## connpassイベント作成フロー

1. `connpass.com/login/` でログイン
2. `connpass.com/event/create/` でタイトル入力 → イベント作成
3. 編集画面で以下を設定:
   - サブタイトル（カテゴリ | 会場）
   - 説明文（Markdown形式）
   - カバー画像（1MB以内、1.91:1推奨）
   - 開催日時
   - 会場情報
   - 参加枠（定員・料金）
   - ハッシュタグ
4. 「公開」ボタンで公開

## 注意事項

- connpassのログインにはSNS認証が必要な場合があります。初回は `--headed` で手動ログインし、Cookieを保存してください
- セレクタはconnpassのUI更新で変わる可能性があります。エラーが出たら `discover` モードで確認
- 投稿済みのワークショップは自動スキップされます（Supabase `event_platform_posts` テーブルで管理）
- 画像は1MB制限があるため、大きい画像は自動でスキップされます

## トラブルシューティング

### ログインが失敗する

```bash
# headed モードで手動ログインしてCookieを保存
npx tsx scripts/event-posting/cli.ts discover --platform connpass
# ブラウザで手動ログイン → Ctrl+C で終了（Cookie自動保存）
```

### セレクタが見つからない

```bash
# discover モードでDevToolsを開いてセレクタ確認
npx tsx scripts/event-posting/cli.ts discover --platform connpass
# connpass.ts の該当セレクタを更新
```

### 投稿記録をリセットしたい

```sql
-- Supabase SQL Editor で実行
DELETE FROM event_platform_posts WHERE platform = 'connpass';
```

## 関連ファイル

- `scripts/event-posting/platforms/connpass.ts` - プラットフォーム実装
- `scripts/event-posting/core/types.ts` - 型定義
- `scripts/event-posting/cli.ts` - CLIエントリポイント
