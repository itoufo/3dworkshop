# Stripe Webhook設定手順

## 概要
決済完了時にメールを送信するため、Stripe Webhookを設定する必要があります。
これにより、実際に決済が成功した場合のみメールが送信されるようになります。

## 設定手順

### 1. Stripe Dashboardでの設定

1. [Stripe Dashboard](https://dashboard.stripe.com/)にログイン
2. 左メニューから「開発者」→「Webhook」を選択
3. 「エンドポイントを追加」をクリック

### 2. エンドポイントURLの設定

以下の情報を入力：

- **エンドポイントURL**: 
  - 本番環境: `https://your-domain.com/api/stripe-webhook`
  - 開発環境: `https://your-ngrok-url.ngrok.io/api/stripe-webhook` （ngrok使用時）

### 3. リッスンするイベントの選択

以下のイベントを選択：

- `checkout.session.completed` - 決済完了時
- `checkout.session.expired` - セッション期限切れ時
- `payment_intent.payment_failed` - 決済失敗時

### 4. Webhook署名シークレットの取得

1. エンドポイントを作成後、「署名シークレット」セクションを確認
2. 「表示」をクリックして署名シークレットを取得
3. 環境変数に設定：

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx
```

## ローカル開発環境での設定

### Stripe CLIを使用する方法

1. Stripe CLIをインストール：
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# その他
# https://stripe.com/docs/stripe-cli#install
```

2. ログイン：
```bash
stripe login
```

3. Webhookをローカルに転送：
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

4. 表示される署名シークレットを環境変数に設定：
```bash
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxxxxxxx
```

### ngrokを使用する方法

1. ngrokをインストール：
```bash
# macOS
brew install ngrok

# その他
# https://ngrok.com/download
```

2. ローカルサーバーを公開：
```bash
ngrok http 3000
```

3. 表示されるHTTPS URLをStripe Dashboardに設定
4. Stripe Dashboardから署名シークレットを取得して環境変数に設定

## 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
# Stripe Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx
```

## テスト方法

### 1. Stripe CLIでテストイベントを送信

```bash
# checkout.session.completedイベントをテスト
stripe trigger checkout.session.completed
```

### 2. 実際の決済フローでテスト

1. テストカード番号を使用：
   - 成功: `4242 4242 4242 4242`
   - 失敗: `4000 0000 0000 9995`

2. 決済フローを実行して、以下を確認：
   - 決済成功時: メールが送信される
   - 決済キャンセル時: メールが送信されない
   - 決済失敗時: メールが送信されない

## トラブルシューティング

### Webhook署名エラー

エラー: `Invalid signature`

対処法:
- 環境変数 `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認
- Stripe Dashboardの署名シークレットと一致しているか確認

### イベントが受信されない

対処法:
- エンドポイントURLが正しいか確認
- ファイアウォールやセキュリティ設定を確認
- Stripe Dashboardでエンドポイントが有効になっているか確認

### ローカル開発でWebhookが機能しない

対処法:
- Stripe CLIまたはngrokが正しく動作しているか確認
- ローカルサーバーが起動しているか確認
- ポート番号が正しいか確認

## セキュリティ上の注意事項

1. **署名検証は必須**: Webhookエンドポイントでは必ず署名を検証してください
2. **HTTPS必須**: 本番環境では必ずHTTPSを使用してください
3. **冪等性の実装**: 同じイベントが複数回送信される可能性があるため、冪等性を考慮した実装にしてください
4. **タイムアウト**: Webhookは5秒以内にレスポンスを返す必要があります

## 実装の詳細

実装済みの機能:
- `/app/api/stripe-webhook/route.ts`: Webhookエンドポイント
- 決済完了時のメール送信
- 決済失敗・キャンセル時の予約ステータス更新
- クーポン使用履歴の記録

変更点:
- メール送信タイミングを決済開始時から決済完了時に変更
- `/app/api/create-checkout-session/route.ts`からメール送信処理を削除