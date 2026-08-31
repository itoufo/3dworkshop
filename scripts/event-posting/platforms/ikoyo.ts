import { Page } from 'playwright'
import { BasePlatform } from './base'
import { PlatformCredentials, PostResult, WorkshopData } from '../core/types'
import { fillInput, uploadFile, waitAndClick, screenshot } from '../core/browser'

class Ikoyo extends BasePlatform {
  readonly name = 'ikoyo' as const
  readonly displayName = 'いこーよ'
  readonly baseUrl = 'https://iko-yo.net'

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
      // TODO: イベント投稿ページURLを discover モードで確認
      // いこーよは施設アカウントからのイベント投稿
      await page.goto(`${this.baseUrl}/events/new`)
      await page.waitForLoadState('networkidle')

      // TODO: 以下のセレクタは discover モードで確認

      // イベント名
      await fillInput(page, 'input[name="title"], #title', workshop.title)

      // イベント説明（親子向けに調整）
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
          'input[name="start_date"], #start-date',
          workshop.event_date,
        )
        // いこーよの場合、終了日も同じ日に設定
        await fillInput(
          page,
          'input[name="end_date"], #end-date',
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

        // 終了時間
        if (workshop.duration) {
          const endTime = this.calcEndTime(workshop.event_time, workshop.duration)
          await fillInput(
            page,
            'input[name="end_time"], #end-time',
            endTime,
          )
        }
      }

      // 参加費
      await fillInput(
        page,
        'input[name="price"], #price',
        workshop.price.toString(),
      )

      // 定員
      await fillInput(
        page,
        'input[name="capacity"], #capacity',
        workshop.max_participants.toString(),
      )

      // 対象年齢（親子向けプラットフォームなので）
      // TODO: 対象年齢のセレクト要素を確認
      // await selectOption(page, '#target-age', '小学生')

      // 開催場所
      if (workshop.location) {
        await fillInput(
          page,
          'input[name="location"], #location',
          workshop.location,
        )
      }

      // 投稿ボタン
      await waitAndClick(page, 'button[type="submit"], input[type="submit"]')
      await page.waitForLoadState('networkidle')

      // いこーよは3日程度の審査あり
      const currentUrl = page.url()
      const match = currentUrl.match(/events\/(\d+)/)

      return {
        success: true,
        platformEventId: match?.[1],
        platformUrl: match ? currentUrl : undefined,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      await screenshot(page, 'ikoyo_create_error')
      return { success: false, error: errorMsg }
    }
  }

  private formatDescription(workshop: WorkshopData): string {
    // いこーよは親子向けなので、親子で楽しめるニュアンスを追加
    const lines: string[] = []
    lines.push(workshop.description)
    lines.push('')
    lines.push('【イベント詳細】')

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
    lines.push('')
    lines.push('お子様と一緒にお気軽にご参加ください！')

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

export default Ikoyo
