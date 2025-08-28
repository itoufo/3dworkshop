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

export function generateSchoolEnrollmentEmail(enrollment: any, classType: string) {
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