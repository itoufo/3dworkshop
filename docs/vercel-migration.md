# Netlify から Vercel への移行手順

最終更新: 2026-09-02

## 方針

**本番（3dlab.jp）を止めない・いつでも Netlify に戻せる状態を保ったまま移す。**

そのために、次の順で進める。DNS を切り替えるまで、3dlab.jp は Netlify のままで一切変わらない。

```
1. 並走      … Vercel にプロジェクトを作り、同じコード・同じ環境変数で動くことを確かめる
                （このとき Vercel 側は *.vercel.app にすら公開しない。Vercel にログインした人だけが見られる）
2. 予行演習  … www.3dlab.jp だけを先に Vercel に向ける
                （www は今も 3dlab.jp へ 301 で飛ばしているだけなので、実質アクセスが無い。
                  本物のドメイン・本物の証明書で Vercel が動くことを、無風で確かめられる）
3. 本切替    … 3dlab.jp（apex）の A レコードを Vercel に向ける
4. 後片付け  … 1〜2週間 Netlify を残して様子を見てから、Netlify 側を止める
```

**切り戻しは常に「DNS を元に戻すだけ」**。Netlify のサイトは消さずに残しておくので、
A レコードを `75.2.60.5` に戻せば数分で元通りになる。

---

## 1. 済んでいること

### Vercel 側

| 項目 | 値 |
|---|---|
| チーム | `yuhoito-walkercojps-projects`（Pro） |
| プロジェクト | `3dlab`（`prj_gQPEKdzabmAtly0StO0Datl06bTN`） |
| GitHub 連携 | `itoufo/3dworkshop`、本番ブランチ `main` |
| Node バージョン | 22.x（ローカル・Netlify と揃えた） |
| 関数を動かす地域 | `sin1`（シンガポール）。Supabase が ap-southeast-1 にあるため |
| デプロイの保護 | `*.vercel.app` は全部 Vercel ログイン必須。カスタムドメイン（3dlab.jp）だけ公開 |
| 自動で付く公開URL | **削除済み**（`3dlab-bay.vercel.app`）。本番と同じ内容が別URLで検索に載るのを防ぐため |
| 追加済みドメイン | `3dlab.jp`（本体）、`www.3dlab.jp`（3dlab.jp へ 301）。DNS はまだ Netlify を向いているので未接続 |
| 環境変数 | Netlify にあった 17 個を production / preview に移送済み。Stripe の鍵3本も投入済み |
| 本番デプロイ | 作成済み（`feat/vercel-migration` から）。まだドメインが向いていないので誰にも見えない。切替の受け皿として待機中 |
| 検証用URL | `https://3dlab-yuhoito-walkercojps-projects.vercel.app`（`x-robots-tag: noindex, nofollow` 付きなので検索には載らない）。ここで下の「4. 動作確認」の大半が実行できる |

### コード側（このブランチ）

| ファイル | 変更 |
|---|---|
| `vercel.json` | 新規。静的アセットのキャッシュヘッダ・旧カテゴリURLの 301・関数の地域・`*.vercel.app` の noindex |
| `next.config.js` | 「本番以外は noindex」の判定を Vercel（`VERCEL_ENV`）にも対応させた／画像キャッシュを31日に |
| `lib/rate-limit.ts` | 回数制限が数える接続元IPに、Vercel が付ける `x-vercel-forwarded-for` を追加 |
| `app/api/admin/chat-knowledge/reembed/route.ts` | `maxDuration = 300` を追加（Vercel でのみ効く） |
| `scripts/vercel-env-sync.sh` | 新規。Netlify の環境変数を Vercel へ移すスクリプト |
| `.vercelignore` | 新規。⚠ Vercel CLI は `.gitignore` ではなく**このファイル**を見る。無いと `vercel deploy` でローカルの `.env` がデプロイのソースに丸ごと入る |

### 実機で確認済み（2026-09-02、Vercel の本番ビルドと Netlify 本番の突き合わせ）

| 項目 | 結果 |
|---|---|
| 講座一覧のカード数 | 61 = 61 |
| 主要9ページの HTTP と `<title>` | すべて 200 かつ一致（トップ / 講座一覧 / カテゴリ一覧 / カテゴリ / ブログ一覧 / 製品 / スクール / 講座詳細 / ブログ詳細） |
| Web Push の公開鍵 | 一致（既存の購読は生き残る） |
| 静的アセットのキャッシュヘッダ | `netlify.toml` と同じ値で返る |
| 旧カテゴリURLのリダイレクト | 301 |
| sitemap.xml | 200 / 296 URL |
| OG画像の動的生成 | 200 / image/png |

**人が触らないと確認できない項目**（管理画面ログイン・画像アップロード・メール送信・Stripe のテスト決済・通知購読）は
下の「4. 動作確認」に残っている。Stripe の Webhook だけは送信先が `3dlab.jp` 固定なので、DNS を向けるまで試せない。
| 各所のコメント | 「Netlify が〜」という記述を、どちらの環境でも通じる書き方に直した |

`netlify.toml` と `public/_redirects` は**わざと残している**。切り戻し先を壊さないため。

---

## 2. 残っていること

### 2-1. Stripe の鍵3本を Vercel に入れる（必須・これが無いとビルドが通らない）

Netlify がシークレット指定している変数は CLI から伏字でしか読めないため、自動で移送できなかった。

⚠ これは実行時だけの問題ではない。`app/api/create-checkout-session/route.ts` などが
モジュール読み込み時に `new Stripe(process.env.STRIPE_SECRET_KEY!)` を実行するので、
**鍵が無いと `next build` の「Collecting page data」で落ちる**
（`Error: Neither apiKey nor config.authenticator provided`）。
GitHub 連携のビルドは、この3本を入れるまで赤いまま。

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Netlify 管理画面（Site configuration → Environment variables）か Stripe ダッシュボードから
**本番（live）の値**を取って、次のように入れる。

```bash
# ⚠ echo は使わない。末尾に改行が入り、鍵の末尾に \n が焼き込まれて原因の分かりにくい失敗になる
printf '%s' 'pk_live_...' | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
printf '%s' 'pk_live_...' | vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY preview
printf '%s' 'sk_live_...' | vercel env add STRIPE_SECRET_KEY production
printf '%s' 'sk_live_...' | vercel env add STRIPE_SECRET_KEY preview
printf '%s' 'whsec_...'   | vercel env add STRIPE_WEBHOOK_SECRET production
printf '%s' 'whsec_...'   | vercel env add STRIPE_WEBHOOK_SECRET preview
```

入れ終わったら、環境変数はビルド時に焼き込まれるものがあるので**再デプロイする**。

### 2-2. 確認しておくこと

| 項目 | 内容 |
|---|---|
| `OPENAI_API_KEY` | Netlify 側で**空**だった。つまり今のチャットボットは本番で「準備中」を返している。Vercel でも同じ状態になる。使いたいなら値を入れる |
| Stripe の Webhook 送信先 | Stripe ダッシュボードの送信先が `https://3dlab.jp/api/stripe-webhook` であること。ドメインが変わらないので、切替後もそのまま動く |
| Web Push の公開鍵 | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` は Netlify と一致していることを確認済み。**この値が変わると既存の通知購読が全部無効になる**ので、絶対に別の値を入れないこと |
| 画像最適化の課金 | Netlify の画像CDNは定額に含まれていたが、Vercel は変換回数で課金される。**対応済み**: `next.config.js` の `minimumCacheTTL` を 86400（1日）から 2678400（31日）に上げた。差し替え時の反映遅れは起きない（`lib/supabase-storage.ts` が毎回ユニークなファイル名を振るので、画像を差し替えれば必ず別URLになる） |

---

## 3. 予行演習: www.3dlab.jp だけを Vercel に向ける

www は今も apex へ 301 で飛ばしているだけなので、ここを Vercel に向けても実害がほぼ無い。
**本物のドメインで証明書が発行されるか**、**Vercel 上の本番ビルドが正しく動くか**を先に確かめられる。

1. Vercel 側で `www.3dlab.jp` の「3dlab.jp へリダイレクト」を**一時的に外す**
   （そうしないと Vercel の中身を見ずに apex＝Netlify に飛んでしまう）
   ```bash
   # Vercel ダッシュボード → 3dlab → Settings → Domains → www.3dlab.jp → Redirect を No Redirect に
   ```
2. ムームードメインの DNS で `www` の CNAME を差し替える
   | | 現在 | 変更後 |
   |---|---|---|
   | `www` CNAME | `3dworkshop.netlify.app.` | `5845dd0cc88fa68e.vercel-dns-016.com.` |
3. 数分待ってから、下の「4. 動作確認」を `https://www.3dlab.jp` に対して一通り実行する
4. 問題なければ、www のリダイレクト設定（3dlab.jp へ 301）を Vercel 側で戻す

この段階で問題が出たら、`www` の CNAME を `3dworkshop.netlify.app.` に戻せば元通り。
**apex（3dlab.jp）は一切触っていないので、本番は無風のまま。**

---

## 4. 動作確認チェックリスト

予行演習時は `https://www.3dlab.jp`、本切替後は `https://3dlab.jp` に対して実行する。

### 自動で見られるもの

```bash
BASE=https://3dlab.jp    # 予行演習中は https://www.3dlab.jp

# 1. トップが 200 で返り、Vercel が返していること
curl -sI $BASE/ | grep -iE '^HTTP|server|x-vercel-id'

# 2. 本番に noindex が付いていないこと（何も出なければ正しい）
curl -sI $BASE/ | grep -i x-robots-tag

# 3. 講座一覧のカード数が Netlify と一致すること
curl -s $BASE/workshops | grep -oE 'href="/workshops/[0-9a-f-]{36}"' | sort -u | wc -l

# 4. Web Push の公開鍵が Netlify と同じこと（違うと既存購読が全部死ぬ）
diff <(curl -s https://3dlab.jp/api/push/public-key) <(curl -s $BASE/api/push/public-key) && echo OK

# 5. 静的アセットのキャッシュヘッダ
for P in /logo.png /icons/icon-192.png /sw.js /manifest.webmanifest; do
  printf '%-24s ' "$P"; curl -sI "$BASE$P" | grep -i '^cache-control'
done
# 期待値: 画像とアイコン = max-age=604800 / sw.js = max-age=0, must-revalidate / manifest = max-age=3600

# 6. 旧カテゴリURLの 301
curl -sI $BASE/workshops/category/family-ai3d-printer-original-work | grep -iE '^HTTP|^location'
# 期待値: 301 → /workshops/category/ai3d-printer-original-work-workshop

# 7. サイトマップ・robots
curl -sI $BASE/sitemap.xml | head -1
curl -s $BASE/robots.txt | head -3
```

### 人が触って見るもの

- [ ] トップ・講座一覧・講座詳細・カテゴリ・ブログ・サービス詳細が表示される
- [ ] 講座詳細の OG 画像（`/blog/<slug>/opengraph-image`）が生成される
- [ ] `/admin` にログインできる（`ADMIN_PASSWORD` の移送確認）
- [ ] 管理画面から画像をアップロードできる（`SUPABASE_SERVICE_ROLE_KEY` の移送確認）
- [ ] 管理画面の「再生成」（`/api/revalidate`）を押すとトップの内容が更新される
- [ ] 無料予約を1件入れて、確認メールが届く（`SMTP_*` の移送確認）
- [ ] **Stripe のテスト決済を1件通し、Webhook が着弾して予約が確定する**（本切替後。ここが一番大事）
- [ ] 通知の購読ダイアログが出る／既存の購読が生きている（`NEXT_PUBLIC_VAPID_PUBLIC_KEY`）
- [ ] 非公開講座のプレビュー（`/workshops/preview/<id>`）がパスワードで開ける

---

## 5. 本切替: apex（3dlab.jp）を Vercel に向ける

**アクセスの少ない時間帯（深夜〜早朝）に行う。**

1. 事前に DNS の TTL を下げる（可能なら 300 秒）。切り戻しを速くするため
2. ムームードメインの DNS で apex の A レコードを差し替える
   | | 現在 | 変更後 |
   |---|---|---|
   | `@` A | `75.2.60.5`（Netlify） | `216.150.1.1` と `216.150.16.1`（Vercel） |
3. `main` にマージする（Vercel が GitHub 連携で本番デプロイを作る）
   - すでに本番デプロイがある場合は `vercel deploy --prod` でも良い
4. 数分待ってから「4. 動作確認」を全部実行する
5. Google Search Console でエラーが増えていないか、翌日に確認する

### 証明書について

DNS が Vercel を向いた直後、Vercel が自動で証明書を発行する（通常は数十秒）。
その数十秒だけ TLS エラーになりうるので、深夜に切り替える。
予行演習（www）を先にやっておけば、発行の挙動を無風で確認できる。

---

## 6. 切り戻し

**いつでも、DNS を戻すだけ。**

| | 戻す値 |
|---|---|
| `@` A | `75.2.60.5` |
| `www` CNAME | `3dworkshop.netlify.app.` |

Netlify のサイト（`3dworkshop` / `aafb1975-ba24-4165-a612-3d661949a2aa`）は消さずに残してある。
`netlify.toml` と `public/_redirects` も残してあるので、コードを戻す必要は無い。

---

## 7. 後片付け（切替から1〜2週間、問題が無いことを確認してから）

- [ ] Netlify の GitHub 連携を解除する（main への push で二重にビルドされ続けるのを止める）
- [ ] `netlify.toml` と `public/_redirects` を削除する
- [ ] Netlify のサイトを削除する（ここまでやると切り戻せなくなる。最後に）
- [ ] `vercel.json` に `*.vercel.app` からのリダイレクト（3dlab.jp へ）を足すかどうか決める
      ※ 今は noindex を付けるだけにしてある。プレビューを普通に開けるようにするため

---

## 付録: Netlify と Vercel の違いと、その埋め方

| 項目 | Netlify | Vercel | 対応 |
|---|---|---|---|
| ビルドの種別を示す環境変数 | `CONTEXT` | `VERCEL_ENV` | `next.config.js` で両方見る |
| 静的アセットのキャッシュヘッダ | `netlify.toml` の `[[headers]]` | `vercel.json` の `headers` | 同じ内容を移植 |
| ホスト単位のリダイレクト | `netlify.toml` / `public/_redirects` | ドメイン設定（www → apex） | Vercel 側のドメイン設定で 301 |
| パスのリダイレクト | `public/_redirects` | `vercel.json` の `redirects` | 旧カテゴリURLを移植（301 のまま） |
| 詐称できない接続元IPのヘッダ | `x-nf-client-connection-ip` | `x-vercel-forwarded-for` | `lib/rate-limit.ts` で両方見る |
| 関数の実行時間上限 | 指定不可（プラグインが無視する） | `maxDuration` で指定可 | reembed に 300 秒を指定 |
| 関数を動かす地域 | 既定は米国 | `vercel.json` の `regions` | `sin1`（Supabase と同じ地域） |
| 画像最適化 | Netlify Image CDN（定額に含まれる） | Vercel Image Optimization（変換回数で課金） | `minimumCacheTTL` を 31日に変更済み |
| ビルド時のシークレット走査 | `SECRETS_SCAN_ENABLED` | 無い | 移送しない |
