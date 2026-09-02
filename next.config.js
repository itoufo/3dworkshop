// 注意: next.config は必ずこの .js 1ファイルだけにすること。
// 以前 next.config.ts が併存していたが、.js が優先されるため .ts の設定は
// 一切適用されていなかった（2026-07 に統合済み）。

// 本番以外のデプロイは検索エンジンにインデックスさせない（本番と同じ内容が
// 別URLで載って、検索結果を食い合うのを防ぐ）。
//   Vercel   … VERCEL_ENV が production / preview / development
//   Netlify  … CONTEXT が production / deploy-preview / branch-deploy
// どちらの環境変数も無いとき（ローカル等）は、誤って本番を noindex にしないよう
// 「noindex を付与しない」に倒す。
const isNonProductionDeploy = process.env.VERCEL
  ? process.env.VERCEL_ENV !== 'production'
  : !!process.env.CONTEXT && process.env.CONTEXT !== 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400, // 最適化済み画像を24時間キャッシュ
  },
  // ホストリダイレクト（www → apex 等）と public/ 静的アセットのキャッシュヘッダは
  // CDN 側で処理する（ここには書かない）。
  //   Vercel  … www → apex は Vercel のドメイン設定、キャッシュヘッダは vercel.json
  //   Netlify … netlify.toml と public/_redirects
  async headers() {
    if (!isNonProductionDeploy) return []
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig
