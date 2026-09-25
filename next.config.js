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

// stores.3dlab.jp（出品マーケット）は同じアプリの app/store/ 以下で出す。
// ホスト名が stores.* のリクエストだけ /store/* に書き換える。
//   stores.localhost:<port> … ローカル確認用（Chrome などは *.localhost を 127.0.0.1 に向ける）
// ⚠ middleware.ts は使わない（ホストリダイレクトは CDN 側、という決まり。上の headers() の注記）。
// ⚠ /api/・/_next/・拡張子つきの静的ファイルは書き換えない。書き換えると
//   ストア側で JS・画像・API が 404 になる。
const STORE_HOST_PATTERN = '^stores\\.(3dlab\\.jp|localhost)$'
const onStoreHost = [{ type: 'host', value: STORE_HOST_PATTERN }]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', has: onStoreHost, destination: '/store' },
        { source: '/sitemap.xml', has: onStoreHost, destination: '/store/sitemap.xml' },
        { source: '/robots.txt', has: onStoreHost, destination: '/store/robots.txt' },
        // ⚠ 書き換えは上から順に連鎖して効く。書き換え後の /store・/store/* を
        //   もう一度書き換えないよう store 自体を除外する（除外しないと / が /store/store になって 404）
        {
          source: '/:path((?!api/|_next/|store(?:/|$))(?!.*\\.[A-Za-z0-9]+$).+)',
          has: onStoreHost,
          destination: '/store/:path',
        },
      ],
    }
  },
  async redirects() {
    // 3dlab.jp/store/* は stores.3dlab.jp へ。同じ内容が2つの URL に載らないようにする
    return [
      {
        source: '/store/:path*',
        has: [{ type: 'host', value: '^(www\\.)?3dlab\\.jp$' }],
        destination: 'https://stores.3dlab.jp/:path*',
        permanent: true,
      },
      {
        source: '/store',
        has: [{ type: 'host', value: '^(www\\.)?3dlab\\.jp$' }],
        destination: 'https://stores.3dlab.jp/',
        permanent: true,
      },
      // ストアのホストで /store/* を直接開かれたら、本来の URL へ（同じ内容の URL を2つ作らない）
      {
        source: '/store/:path*',
        has: onStoreHost,
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
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
    // 最適化済み画像を31日キャッシュする。
    // ⚠ 短くすると、同じ画像が期限のたびに変換され直す。Vercel は画像の変換回数で
    //   課金されるので、ここを 1日 にすると変換が約30倍になる。
    // 差し替え時の反映が遅れる心配は無い。アップロードした画像は
    //   lib/supabase-storage.ts が毎回ユニークなファイル名を振る（upsert: false）ので、
    //   差し替えれば必ず別URLになり、古いキャッシュを引くことがない。
    minimumCacheTTL: 2678400,
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
