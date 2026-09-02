import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_SIZE } from '@/lib/media'

/**
 * 商品の写真・動画をアップロードするための署名付きURLを発行する。
 *
 * 動画はファイルが大きく、Next.js の API を経由させるとリクエスト本体の上限に当たる。
 * ブラウザから Supabase Storage へ直接送ってもらうため、ここでは URL を発行するだけにする。
 * バケットは公開読み取り・書き込み不可なので、この署名付きURL以外からは置けない。
 *
 * ⚠ 先頭で requireAdmin() を通す。ここを叩けると誰でもストレージにファイルを置ける。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'product-media'

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  if (!supabaseAdmin) {
    return Response.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const { contentType, size } = (await request.json()) as { contentType?: string; size?: number }

  if (!contentType || !(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(contentType)) {
    return Response.json(
      { error: 'unsupported_type', message: 'JPEG / PNG / WebP の写真、MP4 / WebM / MOV の動画のみ登録できます。' },
      { status: 400 }
    )
  }
  if (typeof size === 'number' && size > MAX_MEDIA_FILE_SIZE) {
    return Response.json(
      { error: 'too_large', message: `1ファイル ${MAX_MEDIA_FILE_SIZE / 1024 / 1024}MB までです。` },
      { status: 400 }
    )
  }

  // 拡張子で写真/動画を見分けるため（lib/media.ts）、必ず種類に合った拡張子を付ける
  const extension = EXTENSION_BY_TYPE[contentType]
  const path = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)

  if (error || !data) {
    console.error('[admin/product-media] createSignedUploadUrl', error?.message)
    return Response.json(
      { error: 'sign_failed', message: 'アップロードURLの発行に失敗しました。' },
      { status: 500 }
    )
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return Response.json({ bucket: BUCKET, path: data.path, token: data.token, publicUrl })
}
