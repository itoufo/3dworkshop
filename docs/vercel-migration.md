# Netlify から Vercel への移行手順

最終更新: 2026-09-02（**切替完了**）

## 現状: 切替済み

**3dlab.jp は Vercel が配信している。** 2026-09-02 に DNS を切り替えた。

| 項目 | 値 |
|---|---|
| DNS の管理場所 | **Cloudflare**（`rohin.ns.cloudflare.com` / `sunny.ns.cloudflare.com`）。切替時にムームードメインから移管された |
| Cloudflare のプロキシ | **通していない**（DNS のみ）。応答に `server: Vercel` が出て `cf-ray` は出ない |
| `3dlab.jp` A | `216.150.1.1` / `216.150.16.1`（Vercel） |
| `www.3dlab.jp` | Vercel の CNAME。Vercel 側の設定で apex へ 301 |
| Vercel の本番デプロイ | ブランチ `feat/vercel-migration` から作成。**⚠ PR #9 を main にマージするまで、main へ push すると `vercel.json` の無いビルドが本番になる** |
| Netlify | 残してある（切り戻し先）。GitHub 連携も生きている |

### 切り戻し（Cloudflare で戻す）

| レコード | 戻す値 |
|---|---|
| `3dlab.jp` A | `75.2.60.5` |
| `www.3dlab.jp` | CNAME `3dworkshop.netlify.app.` |

Netlify のサイト（`3dworkshop` / `aafb1975-ba24-4165-a612-3d661949a2aa`）と
`netlify.toml` / `public/_redirects` は残してあるので、コードを戻す必要は無い。

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
| 決済（100円の限定公開講座で実測） | Vercel が Checkout セッションを作成（`success_url` が Vercel ホスト）→ 決済完了 → 予約 `confirmed` / `paid` |
| Stripe Webhook の署名検証 | **Vercel の `STRIPE_WEBHOOK_SECRET` は正しい**。正しい署名で 200 `{received:true}`、壊した署名で 400 `Invalid signature`。副作用の無いイベント種別（`default:` 分岐に落ちる）で確認。Netlify を対照に置いて同じ結果 |

⚠ **メール送信（SMTP）だけは Vercel からの実行が未検証。**
100円のテスト決済で確認メールが届いたのは、Stripe の送信先が `https://3dlab.jp/api/stripe-webhook` 固定で、
**Netlify 側が処理したから**。SMTP の設定値は Netlify から平文でそのまま移送しており、
Gmail の SMTP（アプリパスワード）は送信元IPで弾かないので危険は低いが、実測はしていない。
確認するなら「価格0円の限定公開講座を作り、Vercel のURLから無料予約を1件通す」のが副作用が小さい
（`/api/create-free-booking` は Webhook を介さずその場でメールを送るため）。

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

## 5. 本切替（実施済み・2026-09-02）

DNS を Cloudflare へ移管し、apex を Vercel の `216.150.1.1` / `216.150.16.1` に向けた。
証明書は Vercel が自動発行した。切替直後に確認した結果は下記「切替後の実測」。

### 切替後の実測（すべて 3dlab.jp に対して）

| 項目 | 結果 |
|---|---|
| 配信元 | `server: Vercel` / `x-vercel-id: hnd1::…`（東京エッジ、関数は sin1） |
| 本番に noindex が付いていないこと | ✓ `x-robots-tag` なし |
| 講座一覧のカード数 | 61 |
| 静的アセットのキャッシュヘッダ | 画像7日 / sw.js 再検証必須 / manifest 1時間 |
| 旧カテゴリURL | 301 |
| www → apex | 301 |
| sitemap.xml | 200 / 296 URL |
| OG画像の動的生成 | 200 / image/png |
| **Stripe Webhook** | `3dlab.jp/api/stripe-webhook` が **Vercel（sin1）で処理**され 200。署名検証も通過 |
| **メール送信** | Vercel から送信成功（`smtpHost: smtp.gmail.com` / `250 2.0.0 OK … gsmtp` / 3宛先すべて accepted） |
| 切替前後の実顧客の予約 | 0件（作業中に影響を受けた予約は無い） |

## 6. 切り戻し

**Cloudflare の DNS を戻すだけ。**（⚠ ムームードメインではない。切替時に Cloudflare へ移管された）

| レコード | 戻す値 |
|---|---|
| `3dlab.jp` A | `75.2.60.5` |
| `www.3dlab.jp` | CNAME `3dworkshop.netlify.app.` |

Netlify のサイトは消さずに残してある。`netlify.toml` と `public/_redirects` も残してあるので、
コードを戻す必要は無い。

## 7. 後片付け（切替から1〜2週間、問題が無いことを確認してから）

- [ ] Netlify の GitHub 連携を解除する（main への push で二重にビルドされ続けるのを止める）
- [ ] `netlify.toml` と `public/_redirects` を削除する
- [ ] Netlify のサイトを削除する（ここまでやると切り戻せなくなる。最後に）
- [ ] `vercel.json` に `*.vercel.app` からのリダイレクト（3dlab.jp へ）を足すかどうか決める
      ※ 今は noindex を付けるだけにしてある。プレビューを普通に開けるようにするため
- [ ] **決済確認用のテスト講座を消す**
      `6d0a8074-1c37-409f-bc3f-65c988866849`「【テスト】決済確認用ワークショップ（100円）」。
      限定公開（`is_private = true` / パスワード `test100`）なので一般には見えないが、確認が済んだら消す。
      ```sql
      DELETE FROM workshops WHERE id = '6d0a8074-1c37-409f-bc3f-65c988866849';
      ```
      ⚠ 紐づく予約行も一緒に消える（`bookings` は ON DELETE CASCADE）。テスト予約を実績として残したいなら先に控える

---

## 付録: メール送信（SMTP）について分かったこと

現行は **Gmail SMTP**（`smtp.gmail.com:587` / 認証 `itoyuho73@gmail.com` / 差出人 `3DLab運営事務局 <y-sato@sunu25.com>`）。
Vercel からも問題なく送信できることを実測済み。

### ⚠ Xserver の SMTP には切り替えられない

`sunu25.com` は Xserver でメールを運用しているので、`sv14471.xserver.jp` から送れば SPF が通る——
と考えて試したが、**Vercel の関数からは送れない**。

```
554 5.7.1 <ec2-54-169-14-173.ap-southeast-1.compute.amazonaws.com[54.169.14.173]>:
        Client host rejected: Access denied
```

SMTP AUTH は成功しているのに `RCPT TO` で拒否される。Xserver が**接続元のホストを見て弾いている**。
国内の家庭回線（作業用Mac）からは同じ認証情報で送信できたので、認証情報の問題ではない。
`sunu25.xsrv.jp` は証明書が `sv14471.xserver.jp` のものを返すため、そもそも使えない。

**Netlify も同じ理由で切り替えてはいけない**（Netlify も AWS 上で動くため）。

### 今の構成の弱点（未解決）

Gmail のサーバーから `@sunu25.com` を名乗って送っているため、**SPF も DKIM も差出人ドメインと揃っていない**。

- `sunu25.com` の SPF: `v=spf1 +a:sv14471.xserver.jp +a:sunu25.com +mx include:spf.sender.xserver.jp ~all` — Google が入っていない
- Gmail が付ける DKIM 署名は `gmail.com` のもので、`sunu25.com` とは一致しない
- `_dmarc.sunu25.com` は `p=none` なので今は拒否されないが、受信側からは「認証を通っていない送信」に見える

直すなら選択肢は3つ。**どれも未着手**。

| 案 | 内容 | 難点 |
|---|---|---|
| A. Vercel の関数を東京（hnd1）へ | Xserver の拒否が「国外IP」由来なら通る可能性 | 拒否理由が rDNS のクラウド判定なら効かない。Supabase (ap-southeast-1) との往復が +70ms |
| B. Xserver 側で接続元制限を解除 | sin1 のまま Xserver を使える | メールアカウントへの攻撃面が広がる |
| C. 配信サービスを使う（Resend 等） | SPF・DKIM・DMARC を差出人ドメインで揃えられる。到達率も最善 | 導入作業が要る |

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
