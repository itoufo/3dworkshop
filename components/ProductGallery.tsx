'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Package, Play } from 'lucide-react'
import { optimizeImageUrl } from '@/lib/image-optimization'
import { isVideoUrl } from '@/lib/media'

interface Props {
  media: string[]
  alt: string
}

/**
 * 商品の写真・動画を見せるギャラリー。
 * メイン1枚＋サムネイル、左右送り。動画は再生コントロール付きで表示する。
 */
export default function ProductGallery({ media, alt }: Props) {
  const [index, setIndex] = useState(0)

  if (media.length === 0) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
        <Package className="w-20 h-20 text-purple-300" />
      </div>
    )
  }

  const current = media[Math.min(index, media.length - 1)]
  const currentIsVideo = isVideoUrl(current)
  const prev = () => setIndex((i) => (i - 1 + media.length) % media.length)
  const next = () => setIndex((i) => (i + 1) % media.length)

  return (
    <div>
      <div className="relative w-full aspect-square bg-white rounded-2xl shadow-sm overflow-hidden">
        {currentIsVideo ? (
          <video
            key={current}
            src={current}
            className="w-full h-full object-contain bg-black"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={optimizeImageUrl(current, 85)}
            alt={`${alt} の写真 ${index + 1}枚目`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        )}

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="前のメディア"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="次のメディア"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
            {/* 動画はコントロールと重なるので、枚数表示は上に出す */}
            <div
              className={`absolute right-3 px-3 py-1 rounded-full bg-black/60 text-white text-sm z-10 ${
                currentIsVideo ? 'top-3' : 'bottom-3'
              }`}
            >
              {index + 1} / {media.length}
            </div>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {media.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`${isVideoUrl(url) ? '動画' : '写真'} ${i + 1}件目を表示`}
              className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                i === index ? 'border-purple-600' : 'border-transparent hover:border-purple-300'
              }`}
            >
              {isVideoUrl(url) ? (
                <>
                  {/* #t=0.1 を付けると先頭フレームがサムネイルとして出る */}
                  <video
                    src={`${url}#t=0.1`}
                    className="w-full h-full object-cover bg-black"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-5 h-5 text-white" fill="currentColor" />
                  </span>
                </>
              ) : (
                <Image
                  src={optimizeImageUrl(url, 60)}
                  alt={`${alt} のサムネイル ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="20vw"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
