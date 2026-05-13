import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
}

export async function sendEmail({ to, subject, html, text, cc }: SendEmailOptions) {
  // 環境変数のチェック
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('SMTP configuration missing:', {
      host: !!process.env.SMTP_HOST,
      user: !!process.env.SMTP_USER,
      pass: !!process.env.SMTP_PASS
    });
    return { success: false, error: 'SMTP configuration missing' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@3dlab.jp',
    to,
    cc,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  console.log('Attempting to send email:', {
    to,
    cc,
    subject,
    from: mailOptions.from,
    smtpHost: process.env.SMTP_HOST
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    console.error('SMTP Config:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER ? 'Set' : 'Not set',
      pass: process.env.SMTP_PASS ? 'Set' : 'Not set'
    });
    return { success: false, error };
  }
}

interface SchoolEnrollment {
  student_name: string;
  student_age?: number;
  student_grade?: string;
  monthly_fee?: number;
  registration_fee?: number;
}

export function generateSchoolEnrollmentEmail(enrollment: SchoolEnrollment, classType: string) {
  const className = classType === 'basic' 
    ? '基本実践クラス（授業＋作品作り）' 
    : '自由創作クラス（教室開放）'
  
  const monthlyFee = enrollment.monthly_fee || (classType === 'basic' ? 30000 : 17000)
  const registrationFee = enrollment.registration_fee || 22000
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .content { background: #f9fafb; padding: 30px; margin: 20px 0; border-radius: 10px; }
          .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: 600; color: #6b7280; }
          .info-value { color: #111827; }
          .highlight { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>スクール申込完了のお知らせ</h1>
            <p style="margin: 0;">3DLab AI×3Dプリンター教室</p>
          </div>
          
          <div class="content">
            <p>この度は3DLabスクールにお申込みいただき、誠にありがとうございます。</p>
            <p>以下の内容でお申込みを受け付けました。</p>
            
            <h3 style="color: #9333ea;">お申込み内容</h3>
            <div class="info-row">
              <span class="info-label">クラス：</span>
              <span class="info-value">${className}</span>
            </div>
            <div class="info-row">
              <span class="info-label">生徒名：</span>
              <span class="info-value">${enrollment.student_name}様</span>
            </div>
            ${enrollment.student_age ? `
            <div class="info-row">
              <span class="info-label">年齢：</span>
              <span class="info-value">${enrollment.student_age}歳</span>
            </div>
            ` : ''}
            ${enrollment.student_grade ? `
            <div class="info-row">
              <span class="info-label">学年：</span>
              <span class="info-value">${enrollment.student_grade}</span>
            </div>
            ` : ''}
            
            <h3 style="color: #9333ea; margin-top: 30px;">料金について</h3>
            <div class="info-row">
              <span class="info-label">入会金：</span>
              <span class="info-value">¥${registrationFee.toLocaleString()}（初回のみ）</span>
            </div>
            <div class="info-row">
              <span class="info-label">月謝：</span>
              <span class="info-value">¥${monthlyFee.toLocaleString()}/月</span>
            </div>
            
            <div class="highlight">
              <p style="margin: 0;"><strong>📍 教室所在地</strong></p>
              <p style="margin: 5px 0;">文京区湯島3-14-8 5F（湯島駅から徒歩3分）</p>
              <p style="margin: 5px 0;">営業時間：10:00-19:00（定休日：火曜日）</p>
            </div>
            
            <h3 style="color: #9333ea;">今後の流れ</h3>
            <ol>
              <li>初回授業日について、別途メールでご案内いたします</li>
              <li>${classType === 'basic' ? '授業は土・日曜日に開催されます' : '開校日の中からご都合の良い日をお選びいただけます'}</li>
              <li>月謝は${classType === 'free' ? '翌月から' : '今月から'}自動引き落としとなります</li>
            </ol>
            
            <p style="margin-top: 30px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
            <p>
              📧 y-sato@sunu25.com<br>
              📞 080-9453-0911
            </p>
          </div>
          
          <div class="footer">
            <p>このメールは自動送信されています。</p>
            <p>© 2024 3DLab. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
  
  return html
}

export function generateBookingConfirmationEmail(
  workshopTitle: string,
  date: string,
  time: string,
  location: string,
  userName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  userEmail: string
) {
  const subject = `予約確認: ${workshopTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .info-box { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>ワークショップ予約確認</h1>
        </div>
        <div class="content">
          <p>${userName} 様</p>
          <p>この度はワークショップにお申し込みいただき、誠にありがとうございます。</p>
          <p>以下の内容で予約を承りました。</p>
          
          <div class="info-box">
            <h3>予約内容</h3>
            <p><strong>ワークショップ名:</strong> ${workshopTitle}</p>
            <p><strong>開催日:</strong> ${date}</p>
            <p><strong>開催時間:</strong> ${time}</p>
            <p><strong>場所:</strong> ${location}</p>
          </div>
          
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          <p>当日お会いできることを楽しみにしております。</p>
          
          <div class="info-box" style="background-color: #e3f2fd; border-left-color: #2196F3;">
            <h3>お問い合わせ先</h3>
            <p><strong>メール:</strong> <a href="mailto:y-sato@sunu25.com">y-sato@sunu25.com</a></p>
            <p><strong>電話:</strong> <a href="tel:080-9453-0911">080-9453-0911</a></p>
          </div>
        </div>
        <div class="footer">
          <p>このメールは自動送信されています。</p>
          <p>© 2024 3DLab. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generate3DPrintingRequestEmail(
  userName: string,
  fileName: string,
  material: string,
  estimatedCost: number,
  requestId: string
) {
  const subject = '3Dプリント制作依頼を受け付けました';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .info-box { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #2196F3; }
        .cost-box { background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>3Dプリント制作依頼確認</h1>
        </div>
        <div class="content">
          <p>${userName} 様</p>
          <p>3Dプリント制作のご依頼を承りました。</p>
          
          <div class="info-box">
            <h3>依頼内容</h3>
            <p><strong>依頼番号:</strong> ${requestId}</p>
            <p><strong>ファイル名:</strong> ${fileName}</p>
            <p><strong>選択材料:</strong> ${material}</p>
          </div>
          
          <div class="cost-box">
            <h3>料金見積もり</h3>
            <p><strong>基本料金:</strong> ¥5,000</p>
            <p><strong>材料費:</strong> ¥${(estimatedCost - 5000).toLocaleString()}</p>
            <p><strong>合計:</strong> ¥${estimatedCost.toLocaleString()}</p>
          </div>
          
          <p>制作が完了次第、ご連絡いたします。</p>
          <p>通常、3〜5営業日で完成予定です。</p>

          <div class="info-box" style="background-color: #e3f2fd; border-left-color: #2196F3;">
            <h3>お問い合わせ先</h3>
            <p><strong>メール:</strong> <a href="mailto:y-sato@sunu25.com">y-sato@sunu25.com</a></p>
            <p><strong>電話:</strong> <a href="tel:080-9453-0911">080-9453-0911</a></p>
          </div>
        </div>
        <div class="footer">
          <p>このメールは自動送信されています。</p>
          <p>© 2024 3DLab. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generateServiceOrderConfirmationEmail(input: {
  customerName: string;
  serviceTitle: string;
  serviceType: 'custom_made' | 'reprint';
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string | null;
  orderId: string;
}) {
  const typeLabel = input.serviceType === 'reprint' ? '追加印刷' : 'オーダーメイド';
  const subject = `【3DLab】${typeLabel}ご注文ありがとうございます (${input.serviceTitle})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 24px; text-align: center; border-radius: 10px; }
        .info-box { background-color: #f9fafb; border-left: 4px solid #9333ea; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .cost-box { background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 12px; }
        td.label { color: #6b7280; width: 120px; vertical-align: top; }
        td.value { color: #111827; }
        .total { font-size: 20px; font-weight: bold; color: #9333ea; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">ご注文ありがとうございます</h2>
        </div>
        <p>${input.customerName} 様</p>
        <p>${typeLabel}サービスのご注文を承りました。決済が正常に完了しています。</p>

        <div class="info-box">
          <h3 style="margin-top:0;">ご注文内容</h3>
          <table>
            <tr><td class="label">注文番号</td><td class="value">${input.orderId}</td></tr>
            <tr><td class="label">種別</td><td class="value">${typeLabel}</td></tr>
            <tr><td class="label">商品</td><td class="value">${input.serviceTitle}</td></tr>
            <tr><td class="label">単価</td><td class="value">¥${input.unitPrice.toLocaleString()}</td></tr>
            <tr><td class="label">数量</td><td class="value">${input.quantity} 個</td></tr>
            ${input.notes ? `<tr><td class="label">ご要望</td><td class="value">${input.notes.replace(/\n/g, '<br>')}</td></tr>` : ''}
          </table>
        </div>

        <div class="cost-box">
          <table>
            <tr>
              <td class="label">合計金額</td>
              <td class="value total">¥${input.totalAmount.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p>担当者が内容確認の上、3営業日以内に詳細をご連絡いたします。</p>
        <p>ご要望の内容によっては、追加料金や仕様変更のご相談をさせていただく場合があります。</p>

        <div class="info-box" style="background-color:#e3f2fd; border-left-color:#2196F3;">
          <h3 style="margin-top:0;">お問い合わせ先</h3>
          <p><strong>メール:</strong> <a href="mailto:y-sato@sunu25.com">y-sato@sunu25.com</a></p>
          <p><strong>電話:</strong> <a href="tel:080-9453-0911">080-9453-0911</a></p>
        </div>

        <div class="footer">
          <p>このメールは自動送信されています。</p>
          <p>© 2024 3DLab. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}

export function generateServiceRequestEmail(input: {
  serviceTitle: string;
  serviceType: 'custom_made' | 'reprint';
  serviceId: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  quantity?: number | null;
  message?: string | null;
}) {
  const typeLabel = input.serviceType === 'reprint' ? '追加印刷' : 'オーダーメイド';
  const subject = `[${typeLabel}リクエスト] ${input.serviceTitle}`;

  const rows: Array<[string, string]> = [
    ['種別', typeLabel],
    ['サービス', input.serviceTitle],
    ['メール', input.email],
  ];
  if (input.name) rows.push(['お名前', input.name]);
  if (input.phone) rows.push(['電話番号', input.phone]);
  if (input.quantity != null) rows.push(['希望数量', `${input.quantity} 個`]);
  if (input.message) rows.push(['メッセージ', input.message.replace(/\n/g, '<br>')]);

  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px;color:#6b7280;width:100px;vertical-align:top;">${k}</td><td style="padding:8px 12px;color:#111827;">${v}</td></tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(to right, #9333ea, #ec4899); color: white; padding: 24px; text-align: center; border-radius: 10px; }
        .info-box { background-color: #f9fafb; border-left: 4px solid #9333ea; padding: 16px; margin: 20px 0; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">${typeLabel}リクエスト</h2>
        </div>
        <div class="info-box">
          <h3 style="margin-top:0;">${input.serviceTitle}</h3>
          <table>${rowsHtml}</table>
        </div>
        <p>お客様にご連絡の上、お見積もりをお送りください。</p>
        <p><a href="https://3dlab.jp/services/${input.serviceId}">サービス詳細を開く</a></p>
        <div class="footer">
          <p>このメールは自動送信されています。</p>
          <p>© 2024 3DLab. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}