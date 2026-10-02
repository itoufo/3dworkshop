import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'

/**
 * 3Dプリント制作依頼の STL ファイルをアップロードするための署名付きURLを発行する。
 *
 * STL は大きいので、Next.js の API を経由させずブラウザから Supabase Storage へ直接送ってもらう。
 * ここでは「この1ファイルをこの場所に置いてよい」という許可証（署名付きURL）だけを渡す。
 * バケットには誰でも書き込める許可（ポリシー）を置かないので、この URL 以外からは置けない。
 *
 * ⚠ 置く場所（ファイル名）はサーバーが決める。元のファイル名は使わない
 *   （日本語や記号を含む名前は Storage のキーにできず、他人のファイルと同じ名前を狙うこともできてしまう）。
 *   元の名前は依頼行の stl_file_name に別に残る。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'stl-files'

const WINDOW_MS = 10 * 60 * 1000
/** 同じ接続元から10分に発行できる数。選び直しの分の余裕を持たせる */
const MAX_URLS = 20

/**
 * 1ファイルの上限（50MB）。バケット stl-files の file_size_limit と同じ値。
 * ⚠ ここで見ている size は申告値で、署名付きURLへの実際のアップロードには効かない。
 *   実際の上限と種別（model/stl のみ）はバケットの設定が強制する。こちらは先に理由を伝えるためのもの
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const ip = clientIp(request.headers)
  if (await tooManyRequests(`printing-upload-url:${ip}`, { windowMs: WINDOW_MS, max: MAX_URLS })) {
    return NextResponse.json({ error: '短時間に送信が多すぎます。しばらくしてからお試しください。' }, { status: 429 })
  }

  let body: { fileName?: unknown; size?: unknown }
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
    body = parsed as { fileName?: unknown; size?: unknown }
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  if (typeof body.fileName !== 'string' || !body.fileName.toLowerCase().endsWith('.stl')) {
    return NextResponse.json({ error: 'STLファイルのみアップロード可能です' }, { status: 400 })
  }
  const size = Number(body.size)
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: 'ファイルサイズが正しくありません' }, { status: 400 })
  }
  if (size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `ファイルは ${MAX_FILE_SIZE / 1024 / 1024}MB までです` },
      { status: 400 },
    )
  }

  // ⚠ 推測できない名前にする。バケットは公開（URL を知っていれば読める）で、一覧は取れないようにするので、
  //   お客さまの設計データを守っているのは「URL を知らないこと」だけになる。Math.random() は出力から次を予測できる
  const path = `${randomUUID()}.stl`

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    console.error('[printing-upload-url] createSignedUploadUrl', error?.message)
    return NextResponse.json({ error: 'アップロードの準備に失敗しました' }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ bucket: BUCKET, path: data.path, token: data.token, publicUrl })
}
