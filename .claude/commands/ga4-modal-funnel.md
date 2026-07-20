---
description: 予約モーダル内部ファネル(add_to_cart→begin_checkout の離脱)をGA4から深掘り分解する
---

# GA4 予約モーダル内部ファネル 深掘り

「予約するを押してモーダルを開いた(add_to_cart)のに、決済(begin_checkout)まで到達しない」
離脱を、どこで・なぜ落ちているかに分解する。売上の真実は DB / Stripe だが、**離脱理由**はこれで見る。

## 実行

```bash
npm run ga4:modal            # 直近14日
npm run ga4:modal -- --days 30
```

出力は標準出力 ＋ `outputs/ga4-modal-funnel-<date>.md`。

引数 `$ARGUMENTS` があれば日数として渡す（例: `/ga4-modal-funnel 30` → `--days 30`）。

## レポートの見方

1. **モーダル内部ファネル** — `view_item → add_to_cart → ws_form_start → begin_checkout → purchase`
   - `ws_form_start`(入力着手) が add_to_cart に対して低い → **開いて即離脱**（価格ショック/冷やかし）
   - form_start は高いのに begin_checkout が低い → **入力後・送信手前で離脱**（フォーム摩擦/最終決断）
2. **デバイス別** — PC/モバイルで到達率が違う（過去: コンバージョンはモバイル偏重、PCは意欲低）
3. **離脱の閉じ方** — `ws_booking_modal_abandon × method`（x_button / backdrop / escape / unknown）
4. **クーポン成否** — `ws_coupon_apply × valid`（無効コード連打による離脱の可視化）
5. **エラー段階** — `ws_booking_error × step`
6. **ランディング別** — どのWSで予約意図が発生/完了しているか

## 前提・注意

- 認証は `ga4-report` と同じ OAuth 流用（`.env` の `GOOGLE_OAUTH_*`、read-only可）。property は measurement ID から自動解決。
- `method` / `valid` / `step` は **2026-07-20 登録の GA4 カスタムディメンション(EVENT範囲)**。カスタム定義は**遡及しない**ので、それ以前の内訳は空。
- `ws_form_start` は計測実装デプロイ(〜2026-07-18/19)以降のみ。
- 「(データなし)」表示は異常ではなく蓄積待ち。数日後に再実行する。
- 背景・切り分けの詳細はプロジェクトメモリ `ga4-funnel-analytics` を参照。
