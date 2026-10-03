import { NextRequest, NextResponse } from 'next/server'
import { resolveCart } from '@/lib/store/cart-server'
import { isSameOriginJson } from '@/lib/store/request'
import { storeLocaleOf } from '@/lib/store/locale'
import { STORE_MESSAGES } from '@/lib/store/messages'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * カートの画面に出す明細（作品名・組み合わせ・今の価格・買えない理由）。何も書き込まない。
 * 本文の locale（'en'）で、買えない理由などの文言を英語にする。
 */
export async function POST(request: NextRequest) {
  // ⚠ 本文を読む前に弾く。このときは言語が分からないので日本語で返す
  if (!isSameOriginJson(request)) return NextResponse.json({ error: STORE_MESSAGES.ja.badRequest }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const locale = storeLocaleOf(body?.locale)
  let result: Awaited<ReturnType<typeof resolveCart>>
  try {
    result = await resolveCart(body?.items, locale)
  } catch (err) {
    console.error('[store-cart] preview failed:', err)
    return NextResponse.json({ error: STORE_MESSAGES[locale].previewFailed, lines: [] }, { status: 500 })
  }
  if ('error' in result) return NextResponse.json({ error: result.error, lines: [] }, { status: 400 })
  // 出品者の ID は画面に要らない
  return NextResponse.json({
    lines: result.lines.map((l) => ({ ...l, sellerId: undefined })),
  })
}
