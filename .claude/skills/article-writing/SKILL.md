---
name: article-writing
description: 3DLab（3dlab.jp）のブログ記事を執筆する。3Dプリンター・ワークショップ・ものづくりに関する親しみやすい記事をHTML形式で作成する。
allowed-tools: Read, Grep, Glob, Bash(curl *), Bash(cp *), Bash(ls *), WebSearch, WebFetch, mcp__nano-banana__generate_image
---

# Article Writing Skill — 3DLab ブログ

## Overview
3DLab（3dlab.jp）のブログ記事を執筆するためのスキル。
3Dプリンター・ワークショップ・ものづくりに関する、親しみやすく実用的な記事を作成する。

## 記事構成テンプレート

### 必須セクション

1. **リード文** — 記事の概要と読者にとっての価値を簡潔に提示
2. **本文セクション（3〜5セクション）** — 各セクションに `<h2 id="heading-N">` を付与
   - 事象の説明には**具体的な日付・時期**を明記する
   - 数値・統計を含める場合は出典を明記
3. **FAQ（よくある質問）** — `<h2 id="faq">よくある質問</h2>` で記載。3〜5問。
   - 各質問は `<h3>` で記載
   - 読者が検索しそうな疑問に回答する（SEO対策）
4. **参考文献** — `<h2 id="references">参考リンク</h2>` で記載
   - 公式サイト、メーカーページ、信頼性の高いメディアを優先
   - `<ul>` リストで、リンク付きで記載
   - 最低3件以上

### HTML形式

```html
<p>リード文...</p>

<h2 id="heading-1">セクションタイトル</h2>
<p>本文...</p>

<h2 id="heading-2">セクションタイトル</h2>
<p>本文...</p>

<h2 id="faq">よくある質問</h2>
<h3>質問1？</h3>
<p>回答...</p>
<h3>質問2？</h3>
<p>回答...</p>

<h2 id="references">参考リンク</h2>
<ul>
<li><a href="URL">タイトル</a> — 発行元</li>
</ul>
```

## 執筆ガイドライン

### ファクトチェック
- **日付**: 製品発売日、イベント開催日は正確な日付を記載する
- **数値**: 価格、スペック、サイズは一次ソースを確認する
- **引用**: メーカーの発言は出典を明記する
- **確認できない情報**: 「〜とされています」「〜と言われています」で表現し、断定を避ける

### トーン & スタイル
- **「です・ます」調**で統一（親しみやすく丁寧に）
- 専門用語は初出時にわかりやすく説明を添える
- 初心者〜中級者が読んで役立つ内容にする
- 段落は3〜4文程度で区切る
- 3Dプリンターに興味がある一般の方にも読みやすい文体

### SEO 対策
- タイトルにはキーワードを含める
- 各セクションの見出しは具体的・検索可能な文言にする
- FAQ は Google の「他の人はこちらも質問」に表示されることを意識
- タグは記事内容に関連するキーワードを3〜5個設定する

### 文字数の目安
- 本文: 2,000〜4,000文字（HTML込み）
- FAQ: 各回答 80〜150文字
- 参考リンク: 3〜6件

## カテゴリ

記事のテーマに基づいて、以下のカテゴリから最も適切なものを選択する：

| カテゴリ | 対象テーマ |
|----------|-----------|
| `3Dプリンター` | 3Dプリンター本体、材料（フィラメント・レジン）、造形テクニック、メンテナンス |
| `ワークショップ` | 3DLab ワークショップ体験、イベントレポート、参加者の声 |
| `業界ニュース` | 3Dプリンティング業界の最新動向、新製品、技術革新 |
| `初心者ガイド` | 3Dプリンター選び方、はじめ方、基本知識、トラブルシューティング |
| `DIY・ものづくり` | 3Dプリンターを使った作品、DIYプロジェクト、クリエイター紹介 |

## サムネイル画像の生成

記事を保存した後、必ずサムネイル画像を生成し Supabase Storage にアップロードする。

### 手順

1. **画像生成**: `mcp__nano-banana__generate_image` で記事テーマに合ったサムネイルを生成する
   - プロンプト: 記事テーマを反映したイラスト（テキストなし）
   - スタイル: 明るく親しみやすい、3Dプリンティング・ものづくり系
   - アスペクト比: `16:9`
   - 生成されたファイルパスをメモする

2. **Supabase Storage にアップロード**: curl で REST API を使用
   ```bash
   BASE="https://vvmrivgbofwktbhwyewy.supabase.co"
   SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bXJpdmdib2Z3a3RiaHd5ZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MjMwNiwiZXhwIjoyMDY5ODY4MzA2fQ.82khBYSyremx-u8DDaOB2xLOMHv3MLXgyamxgKfup8A"

   curl -X POST "${BASE}/storage/v1/object/workshop-images/blog/{slug}/featured.jpeg" \
     -H "Authorization: Bearer $SERVICE_KEY" \
     -H "Content-Type: image/jpeg" \
     --data-binary @/path/to/generated-image.jpeg
   ```
   - パス形式: `blog/{slug}/featured.jpeg`
   - 既存ファイルを上書きする場合は `-X PUT` を使用

3. **DB更新**: `featured_image_url` を Storage の公開 URL に設定
   ```
   https://vvmrivgbofwktbhwyewy.supabase.co/storage/v1/object/public/workshop-images/blog/{slug}/featured.jpeg
   ```

## DB 保存

### テーブル: `blog_posts`

REST API で保存する。スキーマは `public`（デフォルト）。

**新規記事の INSERT（REST API）:**
```bash
BASE="https://vvmrivgbofwktbhwyewy.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2bXJpdmdib2Z3a3RiaHd5ZXd5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI5MjMwNiwiZXhwIjoyMDY5ODY4MzA2fQ.82khBYSyremx-u8DDaOB2xLOMHv3MLXgyamxgKfup8A"

curl -X POST "${BASE}/rest/v1/blog_posts" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "title": "タイトル",
    "slug": "slug-here",
    "content": "<h2>...</h2><p>...</p>",
    "excerpt": "概要文...",
    "featured_image_url": "https://vvmrivgbofwktbhwyewy.supabase.co/storage/v1/object/public/workshop-images/blog/slug-here/featured.jpeg",
    "category": "3Dプリンター",
    "tags": ["3Dプリンター", "初心者"],
    "author_name": "3DLab",
    "is_published": true,
    "published_at": "now()"
  }'
```

### 重要な注意事項

- `published_at`: REST API では `now()` は使えないため、現在時刻を ISO 8601 形式で設定する。ただし **WebSearch で現在の日時を確認してから設定すること**（AIの内部時計は不正確な可能性があるため）。取得できない場合は `published_at` を省略し、後から手動設定する。
- `is_published`: 常に `true` に設定する
- `slug`: タイトルから英語のケバブケースで生成する（例: `3d-printer-beginners-guide-2026`）
- `tags`: 文字列の配列で指定する（例: `["3Dプリンター", "PLA", "初心者"]`）
- `category`: 上記カテゴリ表から文字列で指定する

### 既存記事の UPDATE（REST API）:
```bash
curl -X PATCH "${BASE}/rest/v1/blog_posts?id=eq.{article-uuid}" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"content": "<h2>...</h2><p>...</p>"}'
```

---

## アフィリエイト記事モード

`article_queue.article_type = 'affiliate'` のテーマで執筆する場合、以下の追加ルールに従う。Amazon Associate（タグ: `3dlab-22`）を使った収益化記事を作成する。

### 法令・規約遵守（必須）

- **景品表示法ステマ規制（2023年10月施行）**: 記事内に**広告であることを明示**する開示文を必ず記載
- **Amazon Associate プログラム規約**:
  - 「Amazon.co.jpのアソシエイトとして、適格販売により収入を得ています」と明記
  - 価格は変動するため「2026年X月時点」と参照時点を明記
  - レビュー数・★評価は時点情報として扱う

### 必須セクション構成（アフィリエイト記事の場合）

1. **PR開示文（記事冒頭）**: `<p class="affiliate-disclosure">` で開示
2. **リード文**: 読者の悩み・選定基準を提示
3. **選定基準セクション**: 「何を見て選ぶべきか」を解説
4. **商品紹介（3〜5商品）**: 各商品を `<h3>` で個別紹介
5. **比較表**: `<table>` で価格・特徴・推奨用途を一覧化
6. **FAQ**: 購入前の疑問に回答
7. **参考リンク**

### Amazonリンクの形式

```html
<a href="https://www.amazon.co.jp/dp/{ASIN}?tag=3dlab-22"
   rel="sponsored nofollow noopener"
   target="_blank">商品名</a>
```

**必須属性**:
- `rel="sponsored nofollow noopener"` — Google公認のスポンサードリンク表記
- `target="_blank"` — 別タブ起動
- `?tag=3dlab-22` — アソシエイトタグ（**必ず含める**）

### ASIN（商品ID）取得手順

1. WebSearch で「[商品名] site:amazon.co.jp」を検索
2. 商品ページURLから ASIN を抽出（`/dp/XXXXXXXXXX/` の10桁英数字部分）
3. WebFetch で商品ページを開き、現在価格・★評価・レビュー数を取得（参照時点を明記）
4. **ASINが特定できない商品はキーワード検索リンクで代替**:
   ```html
   <a href="https://www.amazon.co.jp/s?k={URLエンコードされたキーワード}&tag=3dlab-22"
      rel="sponsored nofollow noopener" target="_blank">商品名</a>
   ```

### PR開示文テンプレート（記事冒頭に必ず配置）

```html
<p class="affiliate-disclosure" style="background:#fff4d6;border:1px solid #f0d160;padding:12px;border-radius:6px;font-size:0.9em;margin-bottom:1.5em;">
本記事には広告（アフィリエイトリンク）が含まれます。Amazon.co.jp のアソシエイトとして、3DLab は適格販売により収入を得ています。掲載価格・在庫情報は{参照時点}時点のものであり、変動する場合があります。
</p>
```

※ フロントエンドで `contains_affiliate=true` の記事には自動で開示バナーを表示するため、**本文先頭の開示文は省略可**（執筆者判断）。ただし**Amazon規約上の出典明記**（「Amazon.co.jpアソシエイトとして...」）は記事内のどこかに必ず含めること。

### 比較表テンプレート

```html
<h2 id="comparison">価格・スペック比較表（2026年X月時点）</h2>
<table>
  <thead>
    <tr><th>商品名</th><th>価格</th><th>造形方式</th><th>造形サイズ</th><th>こんな人に</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><a href="https://www.amazon.co.jp/dp/ASIN?tag=3dlab-22" rel="sponsored nofollow noopener" target="_blank">機種名</a></td>
      <td>¥XX,XXX</td>
      <td>FDM</td>
      <td>220×220×250mm</td>
      <td>入門者向け</td>
    </tr>
  </tbody>
</table>
```

### DB保存時の必須フィールド（アフィリエイト記事）

```bash
# INSERT 時に contains_affiliate: true を必ず指定
curl -X POST "${BASE}/rest/v1/blog_posts" \
  ...
  -d '{
    "title": "...",
    "slug": "...",
    "content": "...",
    "category": "3Dプリンター",
    "tags": ["3Dプリンター", "おすすめ", "比較"],
    "author_name": "3DLab",
    "is_published": true,
    "contains_affiliate": true,   // ← 必須
    "published_at": "..."
  }'
```

### アフィリエイト記事のカテゴリ選定

- 機種比較・選び方系 → `3Dプリンター`
- 初心者向け選び方 → `初心者ガイド`
- フィラメント・素材紹介 → `3Dプリンター`
- ツール・周辺機器 → `DIY・ものづくり`

### 推奨タグ

`["3Dプリンター", "おすすめ", "比較", "{商品ジャンル}", "2026年"]` のようにレビュー・比較系を必ず含める（SEO検索意図のマッチング向上）。

### 執筆スタイル（アフィリエイト記事専用）

- **誇大表現NG**: 「最強」「絶対」「必ず」は避け、「初心者に向いている」「コスパが良い」等の客観表現を使う
- **メリット・デメリット両論併記**: 各商品で「良い点」「気をつけたい点」を必ずセットで記載
- **比較軸の明示**: 価格帯・用途・スキルレベルで読者が自分に合うものを選べるよう導線設計
- **過度なクリック誘導NG**: 「今すぐ買え」ではなく「気になる方は詳細を確認」程度に
