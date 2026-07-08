// 注意: next.config は必ずこの .js 1ファイルだけにすること。
// 以前 next.config.ts が併存していたが、.js が優先されるため .ts の設定は
// 一切適用されていなかった（2026-07 に統合済み）。

// Netlify のビルドコンテキスト（production / deploy-preview / branch-deploy）。
// 本番以外は検索エンジンにインデックスさせない。CONTEXT 未定義（ローカル等）は
// 誤って本番を noindex にしないよう「付与しない」に倒す。
const isNonProductionDeploy =
  !!process.env.CONTEXT && process.env.CONTEXT !== 'production'

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
  // ホストリダイレクト（netlify.app → 3dlab.jp / www → apex）は
  // netlify.toml と public/_redirects が CDN レベルで処理する（ここには書かない）。
  // public/ 静的アセットのキャッシュヘッダも netlify.toml 側で設定する。
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
