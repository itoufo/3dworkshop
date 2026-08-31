import { Page } from 'playwright'
import { BasePlatform } from './base'
import { PlatformCredentials, PostResult, WorkshopData } from '../core/types'
import { screenshot } from '../core/browser'

/**
 * ストアカは「講座」+「日程」モデル。
 * 講座は既にストアカ上に作成済みで、ここでは「日程を追加」するだけ。
 *
 * ワークショップのカテゴリ名 → ストアカ classdetailid のマッピングが必要。
 * マッピングにないワークショップはスキップする。
 */

// ストアカの classdetailid マッピング
// key: ワークショップタイトルに含まれるキーワード → value: ストアカの classdetailid
const CLASS_MAPPING: { keyword: string; classdetailid: string; label: string }[] = [
  { keyword: '親子', classdetailid: '200106', label: '【親子教室】AI×3Dプリンター' },
  { keyword: 'フィギュア', classdetailid: '202514', label: '【フィギュア】AI×3Dフィギュア' },
  { keyword: '電子名刺', classdetailid: '200618', label: 'AI×3Dプリンターで電子名刺' },
  { keyword: 'NFC', classdetailid: '202715', label: '【経営者向け】NFC搭載' },
  { keyword: '推し活', classdetailid: '204304', label: '【推し活グッズ】' },
  { keyword: 'ロボット', classdetailid: '200449', label: '夏休みA特別企画' },
  // デフォルト: 一般的なワークショップ
  { keyword: 'ワークショップ', classdetailid: '199269', label: 'AI×3Dプリンター一般' },
  { keyword: '作品', classdetailid: '199269', label: 'AI×3Dプリンター一般' },
]

class StreetAcademy extends BasePlatform {
  readonly name = 'street-academy' as const
  readonly displayName = 'ストアカ'
  readonly baseUrl = 'https://www.street-academy.com'

  async login(page: Page, credentials: PlatformCredentials): Promise<void> {
    await page.goto(`${this.baseUrl}/d/users/sign_in`)
    await page.waitForLoadState('networkidle')

    await page.fill('input[name="user[email]"]', credentials.email)
    await page.fill('input[name="user[password]"]', credentials.password)
    await page.click('input[type="submit"]')
    await page.waitForLoadState('networkidle')

    // OTP認証チェック
    if (page.url().includes('otp_login')) {
      console.log('    OTP認証が必要です。メールのリンクをクリックしてください。')
      console.log('    待機中（最大120秒）...')
      try {
        await page.waitForURL((url) => !url.toString().includes('otp_login'), {
          timeout: 120000,
        })
        console.log('    OTP認証完了')
      } catch {
        throw new Error('OTP認証タイムアウト（120秒）。--headed モードで実行してください。')
      }
    }

    // ダッシュボードに移動して確認
    await page.goto(`${this.baseUrl}/dashboard/organizers/myclass`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('sign_in')) {
      throw new Error('ログイン失敗')
    }
  }

  async createEvent(
    page: Page,
    workshop: WorkshopData,
    _imagePath: string | null,
  ): Promise<PostResult> {
    try {
      // ワークショップ → ストアカ講座のマッピング
      const mapping = this.findClassMapping(workshop.title)
      if (!mapping) {
        return {
          success: false,
          error: `マッピングなし: タイトル "${workshop.title}" に一致するストアカ講座が見つかりません`,
        }
      }

      console.log(`    ストアカ講座: ${mapping.label} (ID: ${mapping.classdetailid})`)

      // 日程追加ページへ
      await page.goto(
        `${this.baseUrl}/session_details/new?classdetailid=${mapping.classdetailid}`,
      )
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)

      // 過去の日程から複製（最新のセッションを選択）
      const copySelect = page.locator('#js-past_session_details')
      const options = await copySelect.locator('option').all()
      if (options.length > 1) {
        // 最初のoption（空）以外の最新を選択
        const latestValue = await options[1].getAttribute('value')
        if (latestValue) {
          await copySelect.selectOption(latestValue)
          console.log('    過去の日程から複製')
          await page.waitForTimeout(2000) // 複製データの反映待ち
        }
      }

      // 開催形式: 対面
      await page.click('#session_detail_multi_form_online_status_0')

      // 開催エリア: 東京
      await page.selectOption('#session_detail_multi_form_prefecture', '1')
      await page.waitForTimeout(500)
      // 浅草・上野
      await page.selectOption('#session_detail_multi_form_city', '29')

      // 開催場所: 登録スペースから選ぶ
      await page.click('#session_detail_multi_form_is_address_manual_0')
      await page.waitForTimeout(500)

      // 定員
      await page.fill(
        '#session_detail_multi_form_session_capacity',
        workshop.max_participants.toString(),
      )

      // 日時設定
      if (workshop.event_date) {
        const date = new Date(workshop.event_date)
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString()
        const day = date.getDate().toString()

        await page.selectOption('#session_startdate_year', year)
        await page.selectOption('#session_startdate_month', month)
        await page.selectOption('#session_startdate_day', day)
      }

      // 開始時間
      if (workshop.event_time) {
        const [hourStr, minuteStr] = workshop.event_time.split(':')
        const hour = parseInt(hourStr, 10).toString()
        // 分は5分刻み: 最も近い値を選択
        const minute = (Math.round(parseInt(minuteStr, 10) / 5) * 5).toString()

        const startHourId =
          '#session_detail_multi_form_session_datetime_forms_attributes_0_session_start_time_hour'
        const startMinId =
          '#session_detail_multi_form_session_datetime_forms_attributes_0_session_start_time_minute'

        await page.selectOption(startHourId, hour)
        await page.selectOption(startMinId, minute)

        // 終了時間を計算
        const endMinutes = parseInt(hourStr, 10) * 60 + parseInt(minuteStr, 10) + workshop.duration
        const endHour = (Math.floor(endMinutes / 60) % 24).toString()
        const endMinute = (Math.round((endMinutes % 60) / 5) * 5).toString()

        const endHourId =
          '#session_detail_multi_form_session_datetime_forms_attributes_0_session_end_time_hour'
        const endMinId =
          '#session_detail_multi_form_session_datetime_forms_attributes_0_session_end_time_minute'

        await page.selectOption(endHourId, endHour)
        await page.selectOption(endMinId, endMinute)
      }

      // 受講料
      await page.fill('#session_detail_multi_form_cost', workshop.price.toString())

      await page.waitForTimeout(1000)
      await screenshot(page, 'street-academy_before_submit')

      // プレビュー画面で確認ボタン
      await page.click('button.js-preview-submit')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      await screenshot(page, 'street-academy_preview')

      // プレビュー画面から公開ボタンを探す
      // プレビューページの構造は要確認
      const publishBtn = page.locator('button:has-text("公開"), input[type="submit"]:has-text("公開"), a:has-text("公開")')
      if (await publishBtn.count() > 0) {
        await publishBtn.first().click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
        console.log('    公開ボタンクリック完了')
      } else {
        console.log('    プレビュー画面到達。手動で公開してください。')
      }

      const currentUrl = page.url()
      const match = currentUrl.match(/session_details\/(\d+)/) ||
                    currentUrl.match(/myclass\/(\d+)/)

      return {
        success: true,
        platformEventId: match?.[1] || mapping.classdetailid,
        platformUrl: currentUrl,
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      await screenshot(page, 'street-academy_create_error')
      return { success: false, error: errorMsg }
    }
  }

  private findClassMapping(
    title: string,
  ): { classdetailid: string; label: string } | null {
    for (const mapping of CLASS_MAPPING) {
      if (title.includes(mapping.keyword)) {
        return { classdetailid: mapping.classdetailid, label: mapping.label }
      }
    }
    return null
  }
}

export default StreetAcademy
