# サイトマップ生成機能

## 概要

このプロジェクトには、動的にサイトマップ（sitemap.xml）を生成する機能が実装されています。
ワークショップとブログの最新情報をSupabaseから取得し、SEO最適化されたサイトマップを自動生成します。

## 生成されるURL

### 静的ページ
- `/` - トップページ（優先度: 1.0、更新頻度: 日次）
- `/workshops` - ワークショップ一覧（優先度: 0.9、更新頻度: 日次）
- `/blog` - ブログ一覧（優先度: 0.8、更新頻度: 日次）
- `/school` - スクール案内（優先度: 0.7、更新頻度: 週次）

### 動的ページ
- `/workshops/{id}` - 各ワークショップ詳細ページ（優先度: 0.8、更新頻度: 週次）
- `/blog/{slug}` - 各ブログ記事ページ（優先度: 0.7、更新頻度: 月次）

## 使用方法

### 手動でサイトマップを生成

```bash
npm run generate:sitemap
```

このコマンドを実行すると、`public/sitemap.xml` が生成されます。

### ビルド時の自動生成

サイトマップは `npm run build` 実行時に自動的に生成されます（prebuild スクリプトで設定）。

```bash
npm run build
```

## 環境変数

サイトマップ生成には以下の環境変数が必要です：

```bash
# Supabase接続情報
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# サイトのベースURL
NEXT_PUBLIC_APP_URL=https://3dlab.jp  # 本番環境
# または
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 開発環境
```

## 技術仕様

### ファイル構成

- `scripts/generate-sitemap.ts` - サイトマップ生成スクリプト
- `public/sitemap.xml` - 生成されたサイトマップ（自動生成、gitignoreに含めない）

### データソース

- **ワークショップ**: Supabase `workshops` テーブル
  - 取得カラム: `id`, `updated_at`
  - ソート: `updated_at` 降順

- **ブログ記事**: Supabase `blog_posts` テーブル
  - 取得カラム: `slug`, `published_at`, `updated_at`
  - フィルタ: `is_published = true`
  - ソート: `published_at` 降順

### SEO最適化

各URLには以下の情報が含まれます：

- `<loc>` - ページのURL
- `<lastmod>` - 最終更新日時（ISO 8601形式）
- `<changefreq>` - 更新頻度（daily, weekly, monthly）
- `<priority>` - 優先度（0.0 〜 1.0）

## デプロイ時の注意点

### 本番環境デプロイ前の確認

1. **環境変数の設定**
   ```bash
   NEXT_PUBLIC_APP_URL=https://3dlab.jp
   ```
   本番環境では正しいドメインを設定してください。

2. **サイトマップの確認**
   ```bash
   npm run generate:sitemap
   cat public/sitemap.xml | head -30
   ```

3. **Google Search Consoleへの登録**
   サイトマップURL: `https://3dlab.jp/sitemap.xml`

### CI/CDパイプライン

GitHub ActionsやNetlifyなどのCI/CDでビルドする場合、
`npm run build` を実行すると自動的にサイトマップが生成されます。

```yaml
# .github/workflows/deploy.yml の例
- name: Build
  run: npm run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    NEXT_PUBLIC_APP_URL: https://3dlab.jp
```

## トラブルシューティング

### エラー: supabaseUrl is required

環境変数が正しく読み込まれていません。`.env` ファイルが存在し、
正しい値が設定されているか確認してください。

```bash
# .envファイルの確認
cat .env | grep SUPABASE
```

### サイトマップが空または不完全

1. Supabaseへの接続を確認
2. データベースに公開済みのワークショップ/ブログ記事が存在するか確認
3. 実行ログを確認

```bash
npm run generate:sitemap
# ログに「Found X workshops」「Found Y blog posts」と表示される
```

### URLが localhost になっている

`NEXT_PUBLIC_APP_URL` 環境変数が正しく設定されていません。
本番環境では `https://3dlab.jp` を設定してください。

## 今後の拡張案

- [ ] robots.txt との連携
- [ ] 画像サイトマップの追加
- [ ] サイトマップインデックス（複数サイトマップの管理）
- [ ] 多言語対応（hreflang タグ）
- [ ] 差分更新（変更されたURLのみ更新）

## 参考リンク

- [Sitemaps XML format](https://www.sitemaps.org/protocol.html)
- [Google Search Central - サイトマップについて](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Next.js SEO最適化](https://nextjs.org/learn/seo/introduction-to-seo)
