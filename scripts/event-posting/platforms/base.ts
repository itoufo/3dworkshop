import { Browser, Page, BrowserContext } from 'playwright'
import {
  PlatformName,
  PlatformCredentials,
  PostResult,
  WorkshopData,
  PLATFORM_DISPLAY_NAMES,
} from '../core/types'
import {
  launchBrowser,
  createContext,
  saveCookies,
  screenshot,
} from '../core/browser'
import { downloadImage, cleanup as cleanupImages } from '../core/image-handler'
import {
  getUnpostedWorkshops,
  recordSuccess,
  recordReview,
  recordFailure,
} from '../core/state-tracker'

export abstract class BasePlatform {
  abstract readonly name: PlatformName
  abstract readonly displayName: string
  abstract readonly baseUrl: string

  abstract login(page: Page, credentials: PlatformCredentials): Promise<void>
  abstract createEvent(
    page: Page,
    workshop: WorkshopData,
    imagePath: string | null,
  ): Promise<PostResult>

  getCredentials(): PlatformCredentials {
    const envPrefix = this.name.toUpperCase().replace(/-/g, '_')
    const email = process.env[`${envPrefix}_EMAIL`]
    const password = process.env[`${envPrefix}_PASSWORD`]
    if (!email || !password) {
      throw new Error(
        `Missing credentials: ${envPrefix}_EMAIL and ${envPrefix}_PASSWORD must be set`,
      )
    }
    return { email, password }
  }

  async run(
    workshops: WorkshopData[],
    options: { dryRun?: boolean; headed?: boolean } = {},
  ): Promise<void> {
    const displayName = PLATFORM_DISPLAY_NAMES[this.name]
    console.log(`\n=== ${displayName} (${this.name}) ===`)

    const unposted = await getUnpostedWorkshops(this.name, workshops)
    if (unposted.length === 0) {
      console.log('  全ワークショップ投稿済み。スキップします。')
      return
    }

    console.log(`  未投稿: ${unposted.length}件`)

    if (options.dryRun) {
      for (const ws of unposted) {
        console.log(`  [DRY RUN] ${ws.title} (${ws.event_date})`)
      }
      return
    }

    let browser: Browser | null = null
    let context: BrowserContext | null = null

    try {
      browser = await launchBrowser(!options.headed)
      context = await createContext(browser, this.name)
      const page = await context.newPage()

      // Login
      console.log('  ログイン中...')
      const credentials = this.getCredentials()
      await this.login(page, credentials)
      await saveCookies(context, this.name)
      console.log('  ログイン成功')

      // Post each workshop
      for (const ws of unposted) {
        console.log(`\n  投稿中: ${ws.title}`)
        let imagePath: string | null = null

        try {
          // Download image if available
          if (ws.image_url) {
            try {
              imagePath = await downloadImage(ws.image_url)
            } catch (e) {
              console.log(`  画像DL失敗（続行）: ${e}`)
            }
          }

          const result = await this.createEvent(page, ws, imagePath)

          if (result.success) {
            if (result.platformUrl) {
              await recordSuccess(ws.id, this.name, result.platformEventId, result.platformUrl)
              console.log(`  ✓ 投稿成功: ${result.platformUrl}`)
            } else {
              // Some platforms have review period
              await recordReview(ws.id, this.name, '投稿完了（審査待ちの可能性）')
              console.log('  ✓ 投稿完了（審査待ち）')
            }
          } else {
            await recordFailure(ws.id, this.name, result.error || '不明なエラー')
            console.log(`  ✗ 投稿失敗: ${result.error}`)
            await screenshot(page, `${this.name}_error_${ws.id}`)
          }
        } catch (e) {
          const errorMsg = e instanceof Error ? e.message : String(e)
          await recordFailure(ws.id, this.name, errorMsg)
          console.log(`  ✗ エラー: ${errorMsg}`)
          await screenshot(page, `${this.name}_error_${ws.id}`)
        }
      }
    } finally {
      if (context) await context.close()
      if (browser) await browser.close()
      cleanupImages()
    }
  }

  async discover(options: { headed?: boolean } = {}): Promise<void> {
    const displayName = PLATFORM_DISPLAY_NAMES[this.name]
    console.log(`\n=== ${displayName} Discover Mode ===`)
    console.log(`  ${this.baseUrl} を開きます。ブラウザを操作してセレクタを確認してください。`)
    console.log('  Ctrl+C で終了します。\n')

    const browser = await launchBrowser(false) // Always headed for discover
    const context = await createContext(browser, this.name)
    const page = await context.newPage()

    try {
      await page.goto(this.baseUrl)

      // Try login if credentials are available
      try {
        const credentials = this.getCredentials()
        await this.login(page, credentials)
        await saveCookies(context, this.name)
        console.log('  ログイン成功。Cookie保存済み。')
      } catch {
        console.log('  認証情報なし。手動でログインしてください。')
      }

      // Keep browser open until Ctrl+C
      await new Promise((resolve) => {
        process.on('SIGINT', resolve)
      })
    } finally {
      await saveCookies(context, this.name)
      await context.close()
      await browser.close()
    }
  }
}
