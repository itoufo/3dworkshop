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
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@3dlab.example.com',
    to,
    cc,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

export function generateBookingConfirmationEmail(
  workshopTitle: string,
  date: string,
  time: string,
  location: string,
  userName: string,
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
        </div>
        <div class="footer">
          <p>このメールは自動送信されています。</p>
          <p>© 2024 3D Lab Workshop</p>
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
        </div>
        <div class="footer">
          <p>このメールは自動送信されています。</p>
          <p>© 2024 3D Lab</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, html };
}