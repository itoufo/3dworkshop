import { Page } from 'playwright'
import { BasePlatform } from './base'
import { PlatformCredentials, PostResult, WorkshopData } from '../core/types'
import { screenshot } from '../core/browser'

/**
 * connpass イベント投稿
 *
 * connpassのイベント作成フロー:
 * 1. /login/ でメール/パスワードログイン
 * 2. /editmanage/ の「イベントを作成する」モーダルでタイトル入力 → 下書き作成
 * 3. /event/{id}/edit/ のインライン編集画面で各フィールドを編集・保存
 * 4. 「即時公開する」ボタンで公開
 *
 * connpassは「クリック→インライン編集→保存」パターン。
 * 各セクションに個別の「保存」ボタンがある。
 * view ID（name属性の suffix）は動的なため、name^= で部分一致マッチする。
 */

class Connpass extends BasePlatform {
  readonly name = 'connpass' as const
  readonly displayName = 'connpass'
  readonly baseUrl = 'https://connpass.com'

  async login(page: Page, credentials: PlatformCredentials): Promise<void> {
    await page.goto(`${this.baseUrl}/login/`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // connpass login form: gray_form class inputs
    await page.fill('input[name="username"].gray_form', credentials.email)
    await page.fill('input[name="password"].gray_form', credentials.password)

    // 「ログインする」ボタン (検索submitと区別するため class 指定)
    await page.click('button.btn_login.btn_default')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000)

    const url = page.url()
    if (url.includes('/login/')) {
      throw new Error('ログイン失敗。--headed で確認してください。')
    }
  }

  async createEvent(
    page: Page,
    workshop: WorkshopData,
    imagePath: string | null,
  ): Promise<PostResult> {
    try {
      // Step 1: /editmanage/ でイベント新規作成
      await page.goto(`${this.baseUrl}/editmanage/`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // 「イベントを作成する」ボタンクリック → jqModal ポップアップ表示
      // JS直接実行で click（popup overlay のブロックを回避）
      await page.evaluate(() => {
        const btn = document.getElementById('EventCreateButton')
        if (btn) btn.click()
      })
      await page.waitForTimeout(2000)

      // モーダル: div.popup.jqmID1 内のタイトル入力
      const modalTitleInput = page.locator('div.popup.jqmID1 input[name="title"]')
      await modalTitleInput.waitFor({ state: 'visible', timeout: 5000 })
      await modalTitleInput.fill(workshop.title)

      await page.waitForTimeout(500)
      await screenshot(page, 'connpass_modal_filled')

      // モーダル内「イベントを作成」送信ボタン
      const submitBtn = page.locator('div.popup.jqmID1 button.EventCreateSubmit')
      await submitBtn.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(5000)

      const editUrl = page.url()
      const eventIdMatch = editUrl.match(/event\/(\d+)/)
      if (!eventIdMatch) {
        // editmanageに戻った場合、一番上の下書きイベントの編集リンクをクリック
        const editLinks = page.locator('a:has-text("編集する")')
        if (await editLinks.count() > 0) {
          await editLinks.first().click()
          await page.waitForLoadState('domcontentloaded')
          await page.waitForTimeout(2000)
        }
      }

      const currentEditUrl = page.url()
      const eventId = currentEditUrl.match(/event\/(\d+)/)?.[1]
      console.log(`    イベントID: ${eventId || '不明'}`)
      console.log(`    編集画面: ${currentEditUrl}`)

      // Step 2: グループ設定 (AIフレンズを選択)
      await this.selectGroup(page)

      // Step 3: タイトル設定（既に作成時に入力済みだが念のため）
      await this.setTitle(page, workshop.title)

      // Step 4: サブタイトル
      await this.setSubtitle(page, workshop)

      // Step 5: 開催日時
      await this.setDateTime(page, workshop)

      // Step 6: 参加枠（定員・料金）
      await this.setParticipation(page, workshop)

      // Step 7: 会場
      if (workshop.location) {
        await this.setVenue(page, workshop.location)
      }

      // Step 8: 説明文
      await this.setDescription(page, workshop)

      // Step 9: 画像
      if (imagePath) {
        await this.setImage(page, imagePath)
      }

      // Step 10: ハッシュタグ
      await this.setHashtag(page)

      await page.waitForTimeout(1000)
      await screenshot(page, 'connpass_before_publish')

      // Step 11: 「即時公開する」ボタン
      const publishBtn = page.locator('a:has-text("即時公開する"), button:has-text("即時公開する")')
      if (await publishBtn.count() > 0) {
        await publishBtn.first().click()
        await page.waitForTimeout(2000)

        // 公開確認ダイアログ（comment入力＋確認ボタン）
        const publishConfirm = page.locator('button:has-text("即時公開する")').last()
        if (await publishConfirm.count() > 0) {
          await publishConfirm.click()
          await page.waitForLoadState('domcontentloaded')
          await page.waitForTimeout(3000)
        }
        console.log('    公開処理実行')
      } else {
        console.log('    「即時公開する」ボタン未検出。手動で公開してください。')
      }

      await screenshot(page, 'connpass_after_publish')

      const finalUrl = page.url()
      const finalEventId = finalUrl.match(/event\/(\d+)/)?.[1] || eventId

      return {
        success: true,
        platformEventId: finalEventId,
        platformUrl: finalEventId ? `${this.baseUrl}/event/${finalEventId}/` : finalUrl,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      await screenshot(page, 'connpass_create_error')
      return { success: false, error: errorMsg }
    }
  }

  private async selectGroup(page: Page): Promise<void> {
    try {
      const groupSelect = page.locator('select').filter({ hasText: 'グループから選択' })
      if (await groupSelect.count() > 0) {
        // AIフレンズを選択（optionのテキストに含まれる）
        const options = await groupSelect.locator('option').all()
        for (const option of options) {
          const text = await option.textContent()
          if (text?.includes('AIフレンズ') || text?.includes('aifriends')) {
            const value = await option.getAttribute('value')
            if (value) {
              await groupSelect.selectOption(value)
              await page.waitForTimeout(1000)
              console.log('    グループ: AIフレンズ 選択')
              return
            }
          }
        }
      }
    } catch {
      console.log('    グループ選択スキップ')
    }
  }

  private async setTitle(page: Page, title: string): Promise<void> {
    try {
      // タイトルテキストをクリックしてインライン編集を開始
      const titleText = page.locator('input[name="title"]')
      if (await titleText.count() > 0 && await titleText.isVisible()) {
        await titleText.fill(title)
        await this.clickSave(page)
        return
      }

      // タイトルエリアをクリックして input を出す
      // h1 or large text containing the title
      const titleArea = page.locator('.edit_area h1, .edit_area .font_24, h1').first()
      if (await titleArea.count() > 0) {
        await titleArea.click()
        await page.waitForTimeout(1000)
        const titleInput = page.locator('input[name="title"]')
        if (await titleInput.count() > 0) {
          await titleInput.fill(title)
          await this.clickSave(page)
        }
      }
      console.log(`    タイトル: ${title}`)
    } catch {
      console.log('    タイトル設定スキップ')
    }
  }

  private async setSubtitle(page: Page, workshop: WorkshopData): Promise<void> {
    try {
      const subtitleArea = page.locator('text=サブタイトルを入力するにはクリック')
      if (await subtitleArea.count() > 0) {
        await subtitleArea.click()
        await page.waitForTimeout(1000)

        const subtitleInput = page.locator('input[name="subtitle"]')
        if (await subtitleInput.count() > 0) {
          const subtitle = this.buildSubtitle(workshop)
          await subtitleInput.fill(subtitle)
          await this.clickSave(page)
          console.log(`    サブタイトル: ${subtitle}`)
        }
      }
    } catch {
      console.log('    サブタイトル設定スキップ')
    }
  }

  private async setDateTime(page: Page, workshop: WorkshopData): Promise<void> {
    if (!workshop.event_date || !workshop.event_time) return

    try {
      // 開催日時セクションの「(日付を入力)」をクリック
      const dateLabel = page.locator('text=日付を入力').first()
      if (await dateLabel.count() > 0) {
        await dateLabel.click()
        await page.waitForTimeout(1000)
      }

      const date = new Date(workshop.event_date)
      const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
      const [hourStr, minuteStr] = workshop.event_time.split(':')

      // 開始日付
      const startDate = page.locator('input[name="start_date"]')
      if (await startDate.count() > 0) {
        await startDate.fill(dateStr)
      }

      // 開始時間
      const startTime = page.locator('input[name="start_time"]')
      if (await startTime.count() > 0) {
        await startTime.fill(`${hourStr}:${minuteStr}`)
      }

      // 終了日時を計算
      const endMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10) + workshop.duration
      const endH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0')
      const endM = String(endMinutes % 60).padStart(2, '0')

      const endDate = page.locator('input[name="end_date"]')
      if (await endDate.count() > 0) {
        await endDate.fill(dateStr) // 同日
      }

      const endTime = page.locator('input[name="end_time"]')
      if (await endTime.count() > 0) {
        await endTime.fill(`${endH}:${endM}`)
      }

      await this.clickSave(page)
      console.log(`    日時: ${dateStr} ${hourStr}:${minuteStr} - ${endH}:${endM}`)
    } catch {
      console.log('    日時設定スキップ')
    }
  }

  private async setParticipation(page: Page, workshop: WorkshopData): Promise<void> {
    try {
      // 「内容を編集」ボタンで参加枠の編集モードを開く
      const editBtn = page.locator('text=内容を編集').first()
      if (await editBtn.count() > 0) {
        await editBtn.click()
        await page.waitForTimeout(1500)
      }

      // 定員（name属性にviewIDが入るので部分一致）
      const capacityInput = page.locator('input[name^="max_participants_view"]')
      if (await capacityInput.count() > 0) {
        await capacityInput.fill(workshop.max_participants.toString())
      }

      // 料金
      if (workshop.price > 0) {
        // 「会場払い」ラジオボタンを選択
        const placeFeeRadio = page.locator('input[id^="choice_fee_place_view"]')
        if (await placeFeeRadio.count() > 0) {
          await placeFeeRadio.click()
          await page.waitForTimeout(500)
        }

        // 会場払い金額
        const placeFeeInput = page.locator('input[name^="place_fee_view"]')
        if (await placeFeeInput.count() > 0) {
          await placeFeeInput.fill(workshop.price.toString())
        }
      }

      await this.clickSave(page)
      console.log(`    参加枠: 定員${workshop.max_participants}名 / ¥${workshop.price}`)
    } catch {
      console.log('    参加枠設定スキップ')
    }
  }

  private async setVenue(page: Page, location: string): Promise<void> {
    try {
      // 会場セレクトボックス
      const placeSelect = page.locator('#my_places')
      if (await placeSelect.count() > 0) {
        // 「会場を新しく設定する」を選択
        const options = await placeSelect.locator('option').all()
        for (const option of options) {
          const text = await option.textContent()
          if (text?.includes('新しく設定')) {
            const value = await option.getAttribute('value')
            if (value) {
              await placeSelect.selectOption(value)
              await page.waitForTimeout(1000)
              break
            }
          }
        }
      }

      // 会場名入力
      const placeInput = page.locator('input[name="place"]')
      if (await placeInput.count() > 0) {
        await placeInput.fill(location)
      }

      // 住所入力
      const addressInput = page.locator('input[name="address"]')
      if (await addressInput.count() > 0) {
        await addressInput.fill(location)
      }

      await this.clickSave(page)
      console.log(`    会場: ${location}`)
    } catch {
      console.log('    会場設定スキップ')
    }
  }

  private async setDescription(page: Page, workshop: WorkshopData): Promise<void> {
    try {
      // 説明文エリアをクリックして textarea を表示
      const descArea = page.locator('text=イベントの説明文を編集するにはクリック')
      if (await descArea.count() > 0) {
        await descArea.click()
        await page.waitForTimeout(1000)
      }

      const descInput = page.locator('textarea[name="description_input"]')
      if (await descInput.count() > 0) {
        const description = this.formatDescription(workshop)
        await descInput.fill(description)
        await this.clickSave(page)
        console.log('    説明文設定完了')
      }
    } catch {
      console.log('    説明文設定スキップ')
    }
  }

  private async setImage(page: Page, imagePath: string): Promise<void> {
    try {
      // 「クリックして画像を追加」エリアをクリック
      const imageArea = page.locator('text=クリックして画像を追加')
      if (await imageArea.count() > 0) {
        // file inputを探す（hidden になっている場合がある）
        const fileInput = page.locator('input[type="file"]').first()
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(imagePath)
          await page.waitForTimeout(3000)
          console.log('    画像アップロード完了')
        }
      }
    } catch {
      console.log('    画像アップロードスキップ')
    }
  }

  private async setHashtag(page: Page): Promise<void> {
    try {
      const hashArea = page.locator('text=ハッシュタグを入力するにはクリック')
      if (await hashArea.count() > 0) {
        await hashArea.click()
        await page.waitForTimeout(1000)

        const hashInput = page.locator('input[name="hashtag"]')
        if (await hashInput.count() > 0) {
          await hashInput.fill('3Dプリンター')
          await this.clickSave(page)
          console.log('    ハッシュタグ: #3Dプリンター')
        }
      }
    } catch {
      console.log('    ハッシュタグ設定スキップ')
    }
  }

  /**
   * 直近に表示されている「保存」ボタンをクリック
   */
  private async clickSave(page: Page): Promise<void> {
    try {
      // 可視状態の保存ボタンを探す
      const saveBtn = page.locator('button:has-text("保存"):visible, input[value="保存"]:visible').first()
      if (await saveBtn.count() > 0) {
        await saveBtn.click()
        await page.waitForTimeout(1000)
      }
    } catch {
      // 保存ボタンがない場合（自動保存）はスキップ
    }
  }

  private buildSubtitle(workshop: WorkshopData): string {
    const parts: string[] = []
    if (workshop.category?.name) {
      parts.push(workshop.category.name)
    }
    if (workshop.location) {
      parts.push(workshop.location)
    }
    return parts.join(' | ') || 'AI×3Dプリンター体験ワークショップ'
  }

  private formatDescription(workshop: WorkshopData): string {
    const lines: string[] = []

    lines.push('## 概要')
    lines.push('')
    lines.push(workshop.description)
    lines.push('')
    lines.push('## イベント詳細')
    lines.push('')
    if (workshop.location) {
      lines.push(`- **会場**: ${workshop.location}`)
    }
    lines.push(`- **所要時間**: 約${workshop.duration}分`)
    lines.push(`- **定員**: ${workshop.max_participants}名`)
    if (workshop.price > 0) {
      lines.push(`- **参加費**: ¥${workshop.price.toLocaleString()}`)
    } else {
      lines.push('- **参加費**: 無料')
    }
    lines.push('')
    lines.push('## 主催')
    lines.push('')
    lines.push('3D Lab（スリーディーラボ）')
    lines.push('https://3dlab.jp')

    return lines.join('\n')
  }
}

export default Connpass
