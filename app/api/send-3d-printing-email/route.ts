import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, generate3DPrintingRequestEmail } from '@/app/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { order, customer } = await request.json()

    // メール内容を生成
    const emailContent = generate3DPrintingRequestEmail(
      customer.name,
      order.stl_file_name,
      order.material_type,
      order.total_cost,
      order.order_number
    )

    // メール送信
    await sendEmail({
      to: customer.email,
      cc: ['yuho.ito@walker.co.jp', 'y-sato@sunu25.com'],
      subject: emailContent.subject,
      html: emailContent.html
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}