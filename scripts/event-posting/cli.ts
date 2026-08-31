import 'dotenv/config'
import { Command } from 'commander'
import { PLATFORM_NAMES, PlatformName, PLATFORM_DISPLAY_NAMES } from './core/types'
import { fetchFutureWorkshops } from './core/workshop-fetcher'
import { getAllPosts } from './core/state-tracker'
import { BasePlatform } from './platforms/base'

// Platform registry
async function loadPlatform(name: PlatformName): Promise<BasePlatform> {
  const modules: Record<PlatformName, () => Promise<{ default: new () => BasePlatform }>> = {
    'street-academy': () => import('./platforms/street-academy'),
    'peatix': () => import('./platforms/peatix'),
    'aini': () => import('./platforms/aini'),
    'kokuchpro': () => import('./platforms/kokuchpro'),
    'ikoyo': () => import('./platforms/ikoyo'),
    'connpass': () => import('./platforms/connpass'),
  }

  const mod = await modules[name]()
  return new mod.default()
}

const program = new Command()

program
  .name('event-posting')
  .description('外部イベントプラットフォーム自動掲載ツール')
  .version('1.0.0')

// Post command
program
  .command('post')
  .description('ワークショップを外部プラットフォームに掲載')
  .option('-p, --platform <name>', 'プラットフォーム名 (all で全プラットフォーム)', 'all')
  .option('-w, --workshop <id>', '特定のワークショップIDのみ対象')
  .option('-d, --dry-run', 'ドライラン（実際には投稿しない）')
  .option('--headed', 'ブラウザを表示して実行')
  .action(async (opts) => {
    try {
      console.log('ワークショップデータ取得中...')
      let workshops = await fetchFutureWorkshops()

      if (opts.workshop) {
        workshops = workshops.filter((w) => w.id === opts.workshop)
        if (workshops.length === 0) {
          console.error(`ワークショップID ${opts.workshop} が見つかりません（未来の開催分のみ対象）`)
          process.exit(1)
        }
      }

      console.log(`対象ワークショップ: ${workshops.length}件`)

      const platforms: PlatformName[] =
        opts.platform === 'all'
          ? [...PLATFORM_NAMES]
          : [opts.platform as PlatformName]

      if (opts.platform !== 'all' && !PLATFORM_NAMES.includes(opts.platform as PlatformName)) {
        console.error(
          `不明なプラットフォーム: ${opts.platform}\n有効な値: ${PLATFORM_NAMES.join(', ')}`,
        )
        process.exit(1)
      }

      for (const platformName of platforms) {
        const platform = await loadPlatform(platformName)
        await platform.run(workshops, {
          dryRun: opts.dryRun,
          headed: opts.headed,
        })
      }

      console.log('\n完了。')
    } catch (e) {
      console.error('エラー:', e)
      process.exit(1)
    }
  })

// Status command
program
  .command('status')
  .description('投稿状況を表示')
  .option('-p, --platform <name>', 'プラットフォームでフィルタ')
  .action(async (opts) => {
    try {
      const platform = opts.platform as PlatformName | undefined
      const posts = await getAllPosts(platform)

      if (posts.length === 0) {
        console.log('投稿記録なし。')
        return
      }

      console.log('\n投稿状況:')
      console.log('─'.repeat(80))
      console.log(
        'プラットフォーム'.padEnd(16) +
        'ステータス'.padEnd(10) +
        'ワークショップID'.padEnd(40) +
        '投稿日時',
      )
      console.log('─'.repeat(80))

      for (const post of posts) {
        const displayName = PLATFORM_DISPLAY_NAMES[post.platform as PlatformName] || post.platform
        const statusIcon =
          post.status === 'posted' ? '✓' :
          post.status === 'review' ? '◎' :
          post.status === 'failed' ? '✗' : '…'

        console.log(
          `${statusIcon} ${displayName}`.padEnd(16) +
          post.status.padEnd(10) +
          post.workshop_id.padEnd(40) +
          (post.posted_at ? new Date(post.posted_at).toLocaleString('ja-JP') : '-'),
        )

        if (post.platform_url) {
          console.log(`  URL: ${post.platform_url}`)
        }
        if (post.error_message && post.status === 'failed') {
          console.log(`  Error: ${post.error_message}`)
        }
      }

      console.log('─'.repeat(80))

      // Summary
      const summary = posts.reduce(
        (acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      )
      console.log(
        `合計: ${posts.length}件 (` +
        `投稿済: ${summary.posted || 0}, ` +
        `審査中: ${summary.review || 0}, ` +
        `失敗: ${summary.failed || 0}, ` +
        `保留: ${summary.pending || 0})`,
      )
    } catch (e) {
      console.error('エラー:', e)
      process.exit(1)
    }
  })

// Discover command
program
  .command('discover')
  .description('ブラウザを開いてプラットフォームのセレクタを確認')
  .requiredOption('-p, --platform <name>', 'プラットフォーム名')
  .action(async (opts) => {
    try {
      if (!PLATFORM_NAMES.includes(opts.platform as PlatformName)) {
        console.error(
          `不明なプラットフォーム: ${opts.platform}\n有効な値: ${PLATFORM_NAMES.join(', ')}`,
        )
        process.exit(1)
      }

      const platform = await loadPlatform(opts.platform as PlatformName)
      await platform.discover()
    } catch (e) {
      console.error('エラー:', e)
      process.exit(1)
    }
  })

program.parse()
