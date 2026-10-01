import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { STORE_FILES_BUCKET } from '@/lib/store/storage'
import { STORE_DOWNLOAD_MAX_COUNT, STORE_SIGNED_URL_SECONDS } from '@/lib/store/orders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function fail(message: string, status: number) {
  return new NextResponse(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

/**
 * 購入したデータを渡す。URL の合言葉が本人確認を兼ねるので、必ず確かめる:
 *   支払い済みか（返金・キャンセルされていないか）／期限内か／回数の上限内か
 *
 * ⚠ bucket は非公開のまま。渡すのは寿命 60 秒の署名付き URL だけ。
 * ⚠ 回数は「読んだ値のまま」の条件つきで +1 する。同時に何度も叩かれても上限を超えない。
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ token: string }> }) {
  if (!supabaseAdmin) return fail('Server misconfigured', 500)

  const { token } = await context.params
  if (!token || !/^[A-Za-z0-9_-]{40,}$/.test(token)) return fail('リンクが正しくありません', 404)

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: order } = await supabaseAdmin
      .from('store_orders')
      .select('id, kind, status, download_count, download_expires_at, data_file_path, data_file_name, product:store_products(data_file_path, data_file_name, title)')
      .eq('download_token', token)
      .maybeSingle()

    if (!order || order.kind !== 'data') return fail('リンクが正しくありません', 404)
    if (order.status !== 'paid') return fail('このご注文はダウンロードできません。お手数ですがお問い合わせください', 403)
    if (!order.download_expires_at || new Date(order.download_expires_at) < new Date()) {
      return fail('ダウンロード期限が過ぎています。お手数ですがお問い合わせください', 410)
    }
    if (order.download_count >= STORE_DOWNLOAD_MAX_COUNT) {
      return fail('ダウンロード回数の上限に達しました。お手数ですがお問い合わせください', 429)
    }

    // ⚠ 買った時点のファイル（注文に写したもの）を渡す。出品者があとで差し替えた審査前のファイルではない。
    //   写す前の注文だけ、作品の今のファイルに戻る
    const product = (Array.isArray(order.product) ? order.product[0] : order.product) as
      | { data_file_path: string | null; data_file_name: string | null; title: string }
      | null
    const filePath = order.data_file_path ?? product?.data_file_path ?? null
    if (!filePath) return fail('データが見つかりません。お手数ですがお問い合わせください', 404)
    const ext = filePath.split('.').pop() ?? 'stl'
    const fileName = (order.data_file_name || product?.data_file_name || `${product?.title ?? 'model'}.${ext}`).replace(
      /[\\/:*?"<>|\r\n]/g,
      '_',
    )

    // 支払い済みのまま・読んだ回数のまま、のときだけ +1（返金と同時に押されても、上限を同時に超えられても通さない）
    const { data: counted } = await supabaseAdmin
      .from('store_orders')
      .update({ download_count: order.download_count + 1, updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'paid')
      .eq('download_count', order.download_count)
      .select('id')
    if (!counted || counted.length === 0) continue // 状態が変わった。読み直す

    const { data: signed, error } = await supabaseAdmin.storage
      .from(STORE_FILES_BUCKET)
      .createSignedUrl(filePath, STORE_SIGNED_URL_SECONDS, { download: fileName })
    if (error || !signed) {
      console.error('[store-download] sign failed:', error)
      // 渡せなかった分は数えない
      await supabaseAdmin
        .from('store_orders')
        .update({ download_count: order.download_count })
        .eq('id', order.id)
        .eq('download_count', order.download_count + 1)
      return fail('データの取得に失敗しました。時間をおいて再度お試しください', 500)
    }
    return NextResponse.redirect(signed.signedUrl, { status: 303, headers: { 'Cache-Control': 'no-store' } })
  }
  return fail('混み合っています。時間をおいて再度お試しください', 503)
}
