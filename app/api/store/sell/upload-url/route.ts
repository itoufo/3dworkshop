import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireApprovedSeller } from '@/lib/store/session'
import { isSameOriginJson } from '@/lib/store/request'
import { sellerPrefix, STORE_FILES_BUCKET, STORE_MEDIA_BUCKET } from '@/lib/store/storage'
import {
  DATA_EXTENSIONS,
  DATA_MAX_BYTES,
  extensionOf,
  IMAGE_MAX_BYTES,
  IMAGE_TYPES,
} from '@/lib/store/product-rules'

/**
 * 出品者がファイルを置くための署名付きアップロード URL を出す。
 * ブラウザから Supabase Storage へ直接送ってもらう（Vercel の関数は本文 4.5MB までで、STL が通らない）。
 *
 * POST { kind: 'image' | 'data', contentType?, fileName?, size }
 *
 * ⚠ 承認済みの出品者だけ。置き場所はサーバーで決め、本人の `sellers/<ID>/` の下に限る。
 * ⚠ サイズは bucket の file_size_limit でも縛ってある（ここの size は申告値なので信じきらない）。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!isSameOriginJson(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const auth = await requireApprovedSeller()
  if ('denied' in auth) return auth.denied
  if (!supabaseAdmin) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const body = await request.json().catch(() => ({}))
  const size = Number(body?.size)
  const prefix = sellerPrefix(auth.user.seller.id)

  let bucket: string
  let path: string

  if (body?.kind === 'image') {
    const ext = IMAGE_TYPES[String(body.contentType)]
    if (!ext) return NextResponse.json({ error: '画像は JPEG / PNG / WebP にしてください' }, { status: 400 })
    if (!(size > 0 && size <= IMAGE_MAX_BYTES)) {
      return NextResponse.json({ error: `画像は ${IMAGE_MAX_BYTES / 1024 / 1024}MB までです` }, { status: 400 })
    }
    bucket = STORE_MEDIA_BUCKET
    path = `${prefix}${randomUUID()}.${ext}`
  } else if (body?.kind === 'data') {
    const ext = extensionOf(String(body.fileName ?? ''))
    if (!(DATA_EXTENSIONS as readonly string[]).includes(ext)) {
      return NextResponse.json({ error: `データは ${DATA_EXTENSIONS.join(' / ').toUpperCase()} にしてください` }, { status: 400 })
    }
    if (!(size > 0 && size <= DATA_MAX_BYTES)) {
      return NextResponse.json({ error: `データは ${DATA_MAX_BYTES / 1024 / 1024}MB までです` }, { status: 400 })
    }
    bucket = STORE_FILES_BUCKET
    path = `${prefix}${randomUUID()}.${ext}`
  } else {
    return NextResponse.json({ error: 'kind が不正です' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[store/upload-url] sign failed:', error?.message)
    return NextResponse.json({ error: 'アップロードの準備に失敗しました' }, { status: 500 })
  }

  const publicUrl =
    bucket === STORE_MEDIA_BUCKET ? supabaseAdmin.storage.from(bucket).getPublicUrl(path).data.publicUrl : null

  return NextResponse.json({ bucket, path: data.path, token: data.token, publicUrl })
}
