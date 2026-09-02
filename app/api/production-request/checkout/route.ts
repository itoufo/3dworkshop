import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// 制作依頼のお支払いページ (/production-request) 専用の Checkout 作成。
// 金額はお客様が手入力するため DB の価格と突き合わせた検証ができない。
// サーバー側では「整数であること」と下限・上限だけを検証する。
// 5,000円は画面に出す目安であって下限ではない（少額の追加分もこのページで受けるため）。
const MIN_AMOUNT = 500
const MAX_AMOUNT = 1_000_000

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, phone, amount, details } = body as {
      email?: string
      name?: string
      phone?: string
      amount?: number
      details?: string
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
    }
    if (!email || !emailValid(email)) {
      return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
    }

    const requestedAmount = Math.floor(Number(amount))
    if (!Number.isFinite(requestedAmount)) {
      return NextResponse.json({ error: '金額を入力してください' }, { status: 400 })
    }
    if (requestedAmount < MIN_AMOUNT) {
      return NextResponse.json(
        { error: `金額は ¥${MIN_AMOUNT.toLocaleString()} 以上で入力してください` },
        { status: 400 }
      )
    }
    if (requestedAmount > MAX_AMOUNT) {
      return NextResponse.json(
        { error: `¥${MAX_AMOUNT.toLocaleString()} を超えるお支払いは個別にご案内しますので、お問い合わせください` },
        { status: 400 }
      )
    }
    if (details && details.length > 1000) {
      return NextResponse.json({ error: '依頼内容は1000文字以内で入力してください' }, { status: 400 })
    }

    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: '制作依頼',
              description: details ? details.slice(0, 200) : '3Dプリント制作依頼のお支払い',
            },
            unit_amount: requestedAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      locale: 'ja',
      success_url: `${baseUrl}/production-request/success`,
      cancel_url: `${baseUrl}/production-request`,
      metadata: {
        // Webhook でこのメタデータだけを頼りに確認メールを送る（注文レコードは作らない）
        type: 'production_request',
        name: name.slice(0, 200),
        email,
        phone: phone?.slice(0, 50) || '',
        amount: String(requestedAmount),
        details: details?.slice(0, 450) || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('production request checkout error:', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
