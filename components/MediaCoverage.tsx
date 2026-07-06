import Image from 'next/image'
import { PlayCircle, Newspaper, ExternalLink } from 'lucide-react'

// メディア掲載・取材実績セクション（各種申込ページ共通）
export default function MediaCoverage() {
  return (
    <section className="bg-white rounded-2xl shadow-xl p-8 mt-8">
      <h3 className="text-xl font-bold text-gray-900 mb-2">メディア掲載・取材実績</h3>
      <p className="text-gray-600 mb-6">3DLabの取り組みは各種メディアで紹介されています。</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* YouTube */}
        <a
          href="https://www.youtube.com/watch?v=Z6LATnVLvAU&t=1311s"
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all"
        >
          <div className="relative aspect-video bg-gray-100">
            <Image
              src="/media-coverage/youtube-next-nippon.jpg"
              alt="YouTubeチャンネル「AI・ネクストニッポン」で3DLabが取材を受けた際の映像"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors">
              <PlayCircle className="w-14 h-14 text-white drop-shadow-lg" />
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">YouTube</p>
            <p className="text-sm font-medium text-gray-900 leading-relaxed">
              YouTubeチャンネル「AI・ネクストニッポン【公式】」で取材を受けました
              <ExternalLink className="w-3 h-3 inline ml-1 text-gray-400" />
            </p>
          </div>
        </a>

        {/* ShareLab NEWS */}
        <a
          href="https://news.sharelab.jp/cases/other-fields/3dlab-ai3d-251112/"
          target="_blank"
          rel="noopener noreferrer"
          className="group block rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-purple-200 transition-all"
        >
          <div className="relative aspect-video bg-gray-100">
            <Image
              src="/media-coverage/sharelab-article.jpg"
              alt="3Dプリンター専門メディア「ShareLab NEWS」による3DLabワークショップ取材の様子"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
            />
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">ShareLab NEWS</p>
            <p className="text-sm font-medium text-gray-900 leading-relaxed">
              3Dプリンター専門メディア「シェアラボ」で取材を受けました
              <ExternalLink className="w-3 h-3 inline ml-1 text-gray-400" />
            </p>
          </div>
        </a>
      </div>
    </section>
  )
}
