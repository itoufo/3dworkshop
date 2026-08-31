import { Page } from 'playwright'
import { BasePlatform } from './base'
import { PlatformCredentials, PostResult, WorkshopData } from '../core/types'
import { fillInput, uploadFile, waitAndClick, screenshot } from '../core/browser'

class Aini extends BasePlatform {
  readonly name = 'aini' as const
  readonly displayName = 'アイニ'
  readonly baseUrl = 'https://helloaini.com'

  async login(page: Page, credentials: PlatformCredentials): Promise<void> {
    await page.goto(`${this.baseUrl}/login`)
    await page.waitForLoadState('networkidle')

    // TODO: セレクタは discover モードで実サイトを操作して確定
    await fillInput(page, 'input[name="email"], input[type="email"]', credentials.email)
    await fillInput(page, 'input[name="password"], input[type="password"]', credentials.password)
    await waitAndClick(page, 'button[type="submit"], input[type="submit"]')

    await page.waitForLoadState('networkidle')

    const url = page.url()
    if (url.includes('login')) {
      throw new Error('ログイン失敗')
    }
  }

  async createEvent(
    page: Page,
    workshop: WorkshopData,
    imagePath: string | null,
  ): Promise<PostResult> {
    try {
      // TODO: 体験作成ページURLを discover モードで確認
      await page.goto(`${this.baseUrl}/experiences/new`)
      await page.waitForLoadState('networkidle')

      // TODO: 以下のセレクタは discover モードで確認

      // 体験タイトル
      await fillInput(page, 'input[name="title"], #title', workshop.title)

      // 体験の説明
      const description = this.formatDescription(workshop)
      await fillInput(
        page,
        'textarea[name="description"], #description',
        description,
      )

      // メイン画像（アイニでは必須）
      if (imagePath) {
        try {
          await uploadFile(page, 'input[type="file"]', imagePath)
          await page.waitForTimeout(3000)
        } catch {
          console.log('    画像アップロードスキップ')
        }
      } else {
        console.log('    ⚠ アイニではメイン画像が必須です')
      }

      // 料金
      await fillInput(
        page,
        'input[name="price"], #price',
        workshop.price.toString(),
      )

      // 定員
      await fillInput(
        page,
        'input[name="max_participants"], #max-participants',
        workshop.max_participants.toString(),
      )

      // 開催日
      if (workshop.event_date) {
        await fillInput(
          page,
          'input[name="event_date"], #event-date',
          workshop.event_date,
        )
      }

      // 開催時間
      if (workshop.event_time) {
        await fillInput(
          page,
          'input[name="start_time"], #start-time',
          workshop.event_time,
        )
      }

      // 所要時間
      await fillInput(
        page,
        'input[name="duration"], #duration',
        workshop.duration.toString(),
      )

      // 開催場所
      if (workshop.location) {
        await fillInput(
          page,
          'input[name="location"], #location',
          workshop.location,
        )
      }

      // 公開
      await waitAndClick(page, 'button[type="submit"]')
      await page.waitForLoadState('networkidle')

      const currentUrl = page.url()
      const match = currentUrl.match(/experiences\/(\d+)/)

      return {
        success: true,
        platformEventId: match?.[1],
        platformUrl: match ? currentUrl : undefined,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      await screenshot(page, 'aini_create_error')
      return { success: false, error: errorMsg }
    }
  }

  private formatDescription(workshop: WorkshopData): string {
    const lines: string[] = []
    lines.push(workshop.description)
    lines.push('')
    lines.push('【体験の詳細】')

    if (workshop.location) {
      lines.push(`開催場所: ${workshop.location}`)
    }
    lines.push(`所要時間: 約${workshop.duration}分`)
    lines.push(`定員: ${workshop.max_participants}名`)
    lines.push(`参加費: ${workshop.price.toLocaleString()}円`)

    return lines.join('\n')
  }
}

export default Aini
