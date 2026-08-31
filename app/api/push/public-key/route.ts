import { NextResponse } from 'next/server'

/**
 * VAPID の公開鍵を返す。
 *
 * サービスワーカー（public/sw.js）が pushsubscriptionchange で購読を作り直すときに要る。
 * ⚠ sw.js は静的ファイルなのでビルド時の環境変数を焼き込めない。ここから取りに来させる。
 * ⚠ 公開鍵なので秘密ではない（NEXT_PUBLIC_ 付きでフロントにも出ている）。
 *   秘密鍵（VAPID_PRIVATE_KEY）は絶対にここに出さない。
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
  if (!publicKey) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey })
}
