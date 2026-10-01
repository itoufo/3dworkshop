'use client'

import { useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import LoadingOverlay from '@/components/LoadingOverlay'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { ACCEPTED_MEDIA_TYPES, MAX_MEDIA_FILE_SIZE, imageUrlsOnly, isVideoUrl } from '@/lib/media'
import { ImagePlus, Star, Trash2, Video } from 'lucide-react'

interface Props {
  media: string[]
  onChange: (media: string[]) => void
  title?: string
}

/**
 * 写真・動画の登録欄（商品とシリーズで共通）。並び順のまま保存され、先頭がメイン。
 * ファイルは管理 API で署名付き URL を受け取り、ブラウザから Storage へ直接送る。
 */
export default function MediaListEditor({ media, onChange, title = '写真・動画（複数可）' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const [index, file] of files.entries()) {
        setUploadProgress(`${index + 1} / ${files.length} 件目「${file.name}」を送信中...`)

        if (file.size > MAX_MEDIA_FILE_SIZE) {
          throw new Error(
            `「${file.name}」は ${(file.size / 1024 / 1024).toFixed(1)}MB あります。1ファイル ${MAX_MEDIA_FILE_SIZE / 1024 / 1024}MB までです。`
          )
        }
        if (!(ACCEPTED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
          throw new Error(`「${file.name}」は登録できない形式です（${file.type || '不明'}）。`)
        }

        // 動画は大きいので、API を経由せずブラウザから Supabase Storage へ直接送る。
        // その許可証（署名付きURL）だけを管理APIから受け取る
        const signRes = await fetch('/api/admin/product-media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType: file.type, size: file.size }),
        })
        const signed = await signRes.json()
        if (!signRes.ok) {
          throw new Error(signed.message || 'アップロードURLの発行に失敗しました')
        }

        const { error: uploadError } = await supabase.storage
          .from(signed.bucket)
          .uploadToSignedUrl(signed.path, signed.token, file, {
            contentType: file.type,
            // ファイル名は毎回ユニークなので長期キャッシュで安全
            cacheControl: '31536000, immutable',
          })
        if (uploadError) {
          throw new Error(`「${file.name}」のアップロードに失敗しました: ${uploadError.message}`)
        }

        uploaded.push(signed.publicUrl)
      }
      onChange([...media, ...uploaded])
    } catch (error) {
      console.error('Error uploading media:', error)
      alert(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      e.target.value = ''
    }
  }

  return (
    <div className="bg-pink-50 rounded-xl p-6 space-y-4">
      {uploading && <LoadingOverlay message={uploadProgress ?? 'アップロードしています...'} />}
      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-2">
        <ImagePlus className="w-5 h-5 mr-2 text-pink-600" />
        {title}
      </h3>
      <div className="text-sm text-gray-600 space-y-1">
        <p>写真 JPEG / PNG / WebP、動画 MP4 / WebM / MOV。1ファイル {MAX_MEDIA_FILE_SIZE / 1024 / 1024}MB まで。</p>
        <p>並び順のとおりにページへ表示されます。先頭がメインです。</p>
        <p>
          一覧のサムネイルと SNS シェア時の画像には<strong>最初の写真</strong>が使われます（動画は使えません）。
          {media.length > 0 && imageUrlsOnly(media).length === 0 && (
            <span className="text-red-600">写真が1枚もありません。写真を1枚は登録してください。</span>
          )}
        </p>
      </div>

      <input
        type="file"
        accept={ACCEPTED_MEDIA_TYPES.join(',')}
        multiple
        onChange={handleMediaSelect}
        disabled={uploading}
        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
      />

      {media.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {media.map((url, index) => (
            <div key={url} className="relative group">
              <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow bg-black">
                {isVideoUrl(url) ? (
                  <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" controls />
                ) : (
                  <Image src={optimizeImageUrl(url, 60)} alt={`写真 ${index + 1}`} fill className="object-cover" sizes="25vw" />
                )}
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                {index === 0 && <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-xs">メイン</span>}
                {isVideoUrl(url) && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-900/80 text-white text-xs">
                    <Video className="w-3 h-3 mr-1" />
                    動画
                  </span>
                )}
              </div>
              <div className="flex justify-center space-x-2 mt-2">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([url, ...media.filter((u) => u !== url)])}
                    className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 hover:border-purple-500"
                  >
                    <Star className="w-3 h-3 mr-1" />
                    メインに
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onChange(media.filter((u) => u !== url))}
                  className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
