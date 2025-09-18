# メール送信設定ガイド

## 概要
予約完了時に自動送信されるメールの設定方法です。

## 必要な環境変数

`.env.local`に以下の環境変数を設定してください：

```env
# Email (SMTP)
SMTP_HOST=smtp.gmail.com  # Gmailの場合
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com  # 送信元のGmailアドレス
SMTP_PASS=your-app-password  # Gmailのアプリパスワード（2段階認証が必要）
SMTP_FROM=noreply@3dlab.jp  # 送信元として表示されるアドレス
```

## Gmailでのアプリパスワード取得方法

1. Googleアカウントにログイン
2. [セキュリティ設定](https://myaccount.google.com/security)にアクセス
3. 「2段階認証」を有効化
4. 「アプリパスワード」を選択
5. アプリを選択（メール）
6. デバイスを選択（その他 - カスタム名）
7. 「3DLab Mail」などの名前を入力
8. 生成されたパスワードを`SMTP_PASS`に設定

## その他のメールサービス

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Amazon SES
```env
SMTP_HOST=email-smtp.ap-northeast-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
```

## デバッグ方法

1. Vercelのログを確認
   - Vercel Dashboard > Functions > Logs

2. ローカルでのテスト
   ```bash
   npm run dev
   ```
   ブラウザのコンソールとターミナルでログを確認

## トラブルシューティング

### メールが送信されない場合

1. **環境変数の確認**
   - Vercel Dashboard > Settings > Environment Variables
   - すべてのSMTP_*変数が設定されているか確認

2. **Stripeウェブフックの確認**
   - Stripe Dashboard > Webhooks
   - エンドポイントが正しく設定されているか確認
   - イベントが正常に受信されているか確認

3. **ログの確認**
   - `Email sent successfully:` - 成功
   - `Email sending failed:` - 失敗（詳細なエラー情報を確認）
   - `SMTP configuration missing:` - 環境変数が不足

4. **Supabaseの確認**
   - bookingsテーブルのnotesカラムに「メール送信失敗」が記録されているか確認

### Gmailの場合の注意点

- 「安全性の低いアプリのアクセス」は使用不可（廃止済み）
- 必ず2段階認証を有効にしてアプリパスワードを使用
- 1日の送信制限（500通）に注意

## メール送信フロー

1. ユーザーが予約・決済を完了
2. Stripeがウェブフックイベント（checkout.session.completed）を送信
3. `/api/stripe-webhook`がイベントを受信
4. 予約情報をデータベースから取得
5. メールを送信（予約者とCCで管理者宛）
6. 送信結果をログに記録

## CC先の変更

`/app/api/stripe-webhook/route.ts`の以下の部分を編集：

```typescript
cc: ['yuho.ito@walker.co.jp', 'y-sato@sunu25.com'],  // 管理者のメールアドレス
```