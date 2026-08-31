/**
 * PWA アイコン生成スクリプト
 *
 * public/logo.png（カラフルな 3DLab ワードマーク / 背景透過）から
 * ホーム画面・通知に使うアイコン一式を書き出す。
 *
 * ロゴは白地前提の配色なので、背景は白で塗り潰す。
 * maskable は Android が円形などに切り抜くため、
 * 中央 80% のセーフゾーンに収まるよう小さめに配置する。
 *
 *   npm run generate:icons
 *
 * ロゴ画像を差し替えたときだけ実行すればよい（出力はリポジトリにコミット済み）。
 */
import sharp from 'sharp'
import path from 'path'

const SOURCE = path.join(process.cwd(), 'public', 'logo.png')
const OUT_DIR = path.join(process.cwd(), 'public', 'icons')

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

/**
 * 正方形キャンバスの中央にロゴを配置して書き出す。
 * logo_ratio = キャンバス幅に対してロゴの長辺が占める割合。
 */
async function renderIcon(size: number, logoRatio: number, outFile: string) {
  const logoWidth = Math.round(size * logoRatio)
  const logo = await sharp(SOURCE)
    .resize({ width: logoWidth, fit: 'inside', withoutEnlargement: false })
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(path.join(OUT_DIR, outFile))

  console.log(`  ✓ icons/${outFile} (${size}x${size}, logo ${Math.round(logoRatio * 100)}%)`)
}

async function main() {
  console.log('PWA アイコンを生成します...')
  // any: 角丸なしでそのまま表示されるので余白は控えめ
  await renderIcon(192, 0.82, 'icon-192.png')
  await renderIcon(512, 0.82, 'icon-512.png')
  // maskable: 中央 80% だけが必ず残るので、ロゴは 56% に抑える
  await renderIcon(512, 0.56, 'icon-maskable-512.png')
  // iOS ホーム画面（角丸は iOS 側が付ける）
  await renderIcon(180, 0.80, 'apple-touch-icon.png')
  // 通知バッジ（Android のステータスバー用・単色化されるので形だけ）
  await renderIcon(96, 0.78, 'badge-96.png')
  console.log('完了')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
