import { NextResponse } from 'next/server'
import { currentCustomer } from '@/lib/customer-auth'

/**
 * ログイン中の会員の、フォームに入れてよい範囲の情報。
 *
 * ⚠ 返すのは氏名・メール・電話・住所だけ。購入履歴やパスワードの手がかりは返さない。
 *   ここはフォームの初期入力のためだけの窓口で、認証は cookie の署名で済んでいる。
 *
 * ⚠ ログインしていない場合も 200 で { customer: null } を返す。
 *   401 にすると、フォームのある全ページのコンソールにエラーが出て紛らわしい。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const customer = await currentCustomer()
  if (!customer) {
    return NextResponse.json({ customer: null }, { headers: { 'Cache-Control': 'no-store' } })
  }

  return NextResponse.json(
    {
      customer: {
        name: customer.name ?? '',
        email: customer.email,
        phone: customer.phone ?? '',
        address: customer.address ?? '',
      },
    },
    // ⚠ 会員ごとに違う内容なので、CDN にもブラウザにも溜めさせない
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
