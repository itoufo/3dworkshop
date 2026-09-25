'use client'

import { supabase } from '@/lib/supabase'

/**
 * 出品者のファイルをアップロードする（ブラウザ側）。
 * サーバーで署名付き URL をもらい、Supabase Storage へ直接送る
 * （app/api/store/sell/upload-url。Vercel の関数は本文 4.5MB までなので経由させない）。
 */
export async function uploadSellerFile(
  kind: 'image' | 'data',
  file: File
): Promise<{ path: string; publicUrl: string | null } | { error: string }> {
  const res = await fetch('/api/store/sell/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, contentType: file.type, fileName: file.name, size: file.size }),
  })
  const signed = await res.json().catch(() => ({}))
  if (!res.ok) return { error: signed.error || 'アップロードの準備に失敗しました' }

  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: kind === 'data' ? 'application/octet-stream' : file.type,
    })
  if (error) return { error: 'アップロードに失敗しました。ファイルの大きさを確かめてください' }
  return { path: signed.path, publicUrl: signed.publicUrl }
}
