import { Page } from 'playwright'
import { BasePlatform } from './base'
import { PlatformCredentials, PostResult, WorkshopData } from '../core/types'
import { fillInput, uploadFile, waitAndClick, screenshot } from '../core/browser'

class Peatix extends BasePlatform {
  readonly name = 'peatix' as const
  readonly displayName = 'Peatix'
  readonly baseUrl = 'https://peatix.com'

  async login(page: Page, credentials: PlatformCredentials): Promise<void> {
    await page.goto(`${this.baseUrl}/signin`)
    await page.waitForLoadState('networkidle')

    // TODO: セレクタは discover モードで実サイトを操作して確定
    await fillInput(page, 'input[name="email"], #email, input[type="email"]', credentials.email)
    await fillInput(
      page,
      'input[name="password"], #password, input[type="password"]',
      credentials.password,
    )
    await waitAndClick(page, 'button[type="submit"], input[type="submit"]')

    await page.waitForLoadState('networkidle')

    const url = page.url()
    if (url.includes('signin')) {
      throw new Error('ログイン失敗: サインインページから遷移しません')
    }
  }

  async createEvent(
    page: Page,
    workshop: WorkshopData,
    imagePath: string | null,
  ): Promise<PostResult> {
    try {
      // TODO: イベント作成ページURLを discover モードで確認
      await page.goto(`${this.baseUrl}/event/create`)
      await page.waitForLoadState('networkidle')

      // TODO: 以下のセレクタは discover モードで確認

      // イベント名
      await fillInput(page, 'input[name="name"], #event-name', workshop.title)

      // イベント説明
      const description = this.formatDescription(workshop)
      await fillInput(
        page,
        'textarea[name="description"], #event-description',
        description,
      )

      // カバー画像
      if (imagePath) {
        try {
          await uploadFile(page, 'input[type="file"]', imagePath)
          await page.waitForTimeout(3000)
        } catch {
          console.log('    画像アップロードスキップ')
        }
      }

      // 開催日時
      if (workshop.event_date) {
        await fillInput(
          page,
          'input[name="start_date"], #start-date',
          workshop.event_date,
        )
      }

      if (workshop.event_time) {
        await fillInput(
          page,
          'input[name="start_time"], #start-time',
          workshop.event_time,
        )
      }

      // 終了時間を計算
      if (workshop.event_time && workshop.duration) {
        const endTime = this.calcEndTime(workshop.event_time, workshop.duration)
        await fillInput(
          page,
          'input[name="end_time"], #end-time',
          endTime,
        )
      }

      // 会場
      if (workshop.location) {
        await fillInput(
          page,
          'input[name="venue"], #venue-name',
          workshop.location,
        )
      }

      // チケット設定
      // TODO: Peatixのチケット作成フローは複数ステップの可能性
      await fillInput(
        page,
        'input[name="ticket_name"], #ticket-name',
        '参加チケット',
      )
      await fillInput(
        page,
        'input[name="ticket_price"], #ticket-price',
        workshop.price.toString(),
      )
      await fillInput(
        page,
        'input[name="ticket_quantity"], #ticket-quantity',
        workshop.max_participants.toString(),
      )

      // 公開
      await waitAndClick(page, 'button[type="submit"], #publish-btn')
      await page.waitForLoadState('networkidle')

      const currentUrl = page.url()
      const match = currentUrl.match(/event\/(\d+)/)

      return {
        success: true,
        platformEventId: match?.[1],
        platformUrl: match ? currentUrl : undefined,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      await screenshot(page, 'peatix_create_error')
      return { success: false, error: errorMsg }
    }
  }

  private formatDescription(workshop: WorkshopData): string {
    const lines: string[] = []
    lines.push(workshop.description)
    lines.push('')
    lines.push('【イベント詳細】')

    if (workshop.location) {
      lines.push(`会場: ${workshop.location}`)
    }
    lines.push(`所要時間: 約${workshop.duration}分`)
    lines.push(`定員: ${workshop.max_participants}名`)

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

export default Peatix
