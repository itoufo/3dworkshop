import { Page } from 'playwright'
import { BasePlatform } from './base'
import { PlatformCredentials, PostResult, WorkshopData } from '../core/types'
import { fillInput, uploadFile, waitAndClick, screenshot } from '../core/browser'

class Kokuchpro extends BasePlatform {
  readonly name = 'kokuchpro' as const
  readonly displayName = 'こくちーず'
  readonly baseUrl = 'https://www.kokuchpro.com'

  async login(page: Page, credentials: PlatformCredentials): Promise<void> {
    await page.goto(`${this.baseUrl}/login/`)
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
      // TODO: イベント登録ページURLを discover モードで確認
      await page.goto(`${this.baseUrl}/event/new/`)
      await page.waitForLoadState('networkidle')

      // TODO: 以下のセレクタは discover モードで確認

      // イベント名
      await fillInput(page, 'input[name="title"], #title', workshop.title)

      // 概要（こくちーずでは80文字制限）
      const summary = workshop.description.substring(0, 80)
      await fillInput(
        page,
        'input[name="summary"], #summary, textarea[name="summary"]',
        summary,
      )

      // 詳細説明
      const description = this.formatDescription(workshop)
      await fillInput(
        page,
        'textarea[name="description"], #description',
        description,
      )

      // 画像
      if (imagePath) {
        try {
          await uploadFile(page, 'input[type="file"]', imagePath)
          await page.waitForTimeout(3000)
        } catch {
          console.log('    画像アップロードスキップ')
        }
      }

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

      // 終了時間
      if (workshop.event_time && workshop.duration) {
        const endTime = this.calcEndTime(workshop.event_time, workshop.duration)
        await fillInput(
          page,
          'input[name="end_time"], #end-time',
          endTime,
        )
      }

      // 開催場所
      if (workshop.location) {
        await fillInput(
          page,
          'input[name="location"], #location',
          workshop.location,
        )
      }

      // 定員
      await fillInput(
        page,
        'input[name="capacity"], #capacity',
        workshop.max_participants.toString(),
      )

      // 参加費
      await fillInput(
        page,
        'input[name="price"], #price',
        workshop.price.toString(),
      )

      // 登録ボタン
      await waitAndClick(page, 'button[type="submit"], input[type="submit"]')
      await page.waitForLoadState('networkidle')

      // こくちーずは3日程度の審査あり
      const currentUrl = page.url()
      const match = currentUrl.match(/event\/(\d+)/)

      return {
        success: true,
        platformEventId: match?.[1],
        // 審査があるのでURLは暫定
        platformUrl: match ? currentUrl : undefined,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      await screenshot(page, 'kokuchpro_create_error')
      return { success: false, error: errorMsg }
    }
  }

  private formatDescription(workshop: WorkshopData): string {
    const lines: string[] = []
    lines.push(workshop.description)
    lines.push('')
    lines.push('【開催概要】')

    if (workshop.location) {
      lines.push(`会場: ${workshop.location}`)
    }
    if (workshop.event_date) {
      const date = new Date(workshop.event_date)
      lines.push(`日時: ${date.toLocaleDateString('ja-JP')}`)
    }
    if (workshop.event_time) {
      lines.push(`開始: ${workshop.event_time}`)
    }
    lines.push(`所要時間: 約${workshop.duration}分`)
    lines.push(`定員: ${workshop.max_participants}名`)
    lines.push(`参加費: ${workshop.price.toLocaleString()}円`)

    return lines.join('\n')
  }

  private calcEndTime(startTime: string, durationMin: number): string {
    const [h, m] = startTime.split(':').map(Number)
    const totalMin = h * 60 + m + durationMin
    const endH = Math.floor(totalMin / 60) % 24
    const endM = totalMin % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }
}

export default Kokuchpro
