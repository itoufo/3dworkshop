# 3dworkshop（3DLab / 3dlab.jp）

3Dプリンター教室 3DLab の公式サイト。ワークショップ予約・スクール申込・物販・制作依頼・ブログ・管理画面を1つの Next.js アプリで持つ。

- Next.js 15（App Router）+ TypeScript + Tailwind CSS 4
- Supabase（DB / Storage。**別アプリと相乗りのプロジェクト**。public スキーマにも他アプリのテーブルがある）
- Stripe（決済・サブスクリプション）、SMTP（確認メール）
- デプロイは Vercel。**`main` への push がそのまま本番**。DNS は Cloudflare
- **このリポジトリは公開（PUBLIC）**。鍵・秘密・未修正の脆弱性の詳細をファイル・issue・PR・コミット文に書かない

## コマンド

```bash
npm ci                     # 依存の導入（worktree ごとに要る）
npx tsc --noEmit -p .      # 型チェック
npm run lint               # ESLint（next lint）
npx next dev -p 3010       # 開発サーバー。3000 は他プロジェクトが使うので空きポートを指定する
```

テストスイートは無い。ゲートは「型チェック・lint（CI）」と「Vercel のプレビュービルド」。

ローカルの `.env` は本番そのもの（本番 DB、`sk_live_` の Stripe、実送信の SMTP）。動作確認でサーバーを立てるときは
`SMTP_HOST= STRIPE_SECRET_KEY=sk_test_invalid npx next dev -p 3010` のように止めて起動し、作ったテスト行は必ず消す。

## 変更の流れ

1. `origin/main` から worktree を切って作業する（`.git-worktrees/<slug>`）。main の作業ツリーは触らない
2. 型チェックと lint を通してから push し、PR を作る
3. PR には CI（`.github/workflows/ci.yml`）と Claude のレビュー（`claude-pr-review.yml`）が付く。指摘は直してから、マージはユーザーが判断する
4. マージ＝本番デプロイ。デプロイ後に本番で確認する

DB の変更は `supabase/migrations/` に idempotent な SQL を置き、psql で直接当てる（`supabase db push` は使わない。未適用の他のファイルを巻き込む）。
権限・RLS を締める変更は、それに依存しないコードを先にデプロイしてから当て、当てた後にコミットする。

## 守ること（コード）

- **ブラウザ（client component）は公開の anon キーしか持てない。** 個人情報のテーブル（customers / bookings / school_enrollments / printing_orders など）の読み書きと、すべての書き込みはサーバー側のルート（service role、`@/lib/supabase-admin`）を通す
- 管理画面は `/api/admin/*` を使い、各ハンドラの先頭で `requireAdmin()`（`lib/admin-auth.ts`）を通す。公開コンテンツの読み書きは `lib/admin-rows.ts` / `lib/admin-rows-client.ts`、個人情報は返す列を絞った専用ルート
- 一覧をサーバー経由で返すときは画面が使う列だけにする（Vercel の応答は 4.5MB まで）
- メール本文に利用者の入力を埋め込むときは `escapeHtml()` を通す
- 電話番号 080-9453-0911 はサイト・メール・JSON-LD に出さない。連絡先は 3dlab@sunu25.com
- 公開ページの一覧は ISR。ISR のルートで `cookies()` を呼ばない（本番で 500 になる）

## 自動実行（GitHub Actions）

| ワークフロー | 役割 |
|---|---|
| `ci.yml` | PR と main への push で型チェックと lint |
| `claude-pr-review.yml` | PR が開かれた・更新されたときに Claude がレビューしてコメントする |
| `claude.yml` | PR / issue のコメントで `@claude` と呼ぶと、その場で答える・直す |
| `daily-survey.yml` | 毎日のアンケート公開（`/api/cron/daily-survey` を叩く） |

Claude のワークフローは、Claude の GitHub App のインストールと Secrets の `CLAUDE_CODE_OAUTH_TOKEN` が要る（各ファイル冒頭のコメント参照）。
