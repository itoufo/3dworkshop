import { NextRequest, NextResponse } from 'next/server'
import { resolveCart } from '@/lib/store/cart-server'
import { isSameOriginJson } from '@/lib/store/request'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** カートの画面に出す明細（作品名・組み合わせ・今の価格・買えない理由）。何も書き込まない */
export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const result = await resolveCart(body?.items)
  if ('error' in result) return NextResponse.json({ error: result.error, lines: [] }, { status: 400 })
  // 出品者の ID は画面に要らない
  return NextResponse.json({
    lines: result.lines.map((l) => ({ ...l, sellerId: undefined })),
  })
}
