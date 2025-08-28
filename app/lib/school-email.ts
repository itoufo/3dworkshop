export function generateSchoolEnrollmentEmail(
  studentName: string,
  parentName: string,
  className: string,
  email: string
) {
  const subject = `スクール入会確認: 3DLab ${className}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f4f4f4; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .info-box { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #9333ea; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>3DLab スクール入会確認</h1>
        </div>
        <div class="content">
          <p>${parentName} 様</p>
          <p>この度は3DLabスクールにご入会いただき、誠にありがとうございます。</p>
          <p>以下の内容でお申込みを承りました。</p>
          
          <div class="info-box">
            <h3>入会内容</h3>
            <p><strong>お子様のお名前:</strong> ${studentName} 様</p>
            <p><strong>クラス:</strong> ${className}</p>
            <p><strong>メールアドレス:</strong> ${email}</p>
          </div>
          
          <p>初回授業日や持ち物などの詳細につきましては、別途ご連絡させていただきます。</p>
          <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>
          
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