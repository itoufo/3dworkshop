import * as fs from 'fs'
import * as path from 'path'
import { chromium, Browser, Page, BrowserContext } from 'playwright'
import { PlatformName } from './types'

const COOKIES_DIR = path.join(process.cwd(), 'temp', 'cookies')
const SCREENSHOTS_DIR = path.join(process.cwd(), 'temp', 'screenshots')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function launchBrowser(headless = true): Promise<Browser> {
  return chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
}

export async function createContext(
  browser: Browser,
  platform: PlatformName,
): Promise<BrowserContext> {
  ensureDir(COOKIES_DIR)

  const cookiePath = path.join(COOKIES_DIR, `${platform}.json`)
  const context = await browser.newContext({
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })

  // Restore cookies if saved
  if (fs.existsSync(cookiePath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiePath, 'utf-8'))
      await context.addCookies(cookies)
    } catch {
      // Ignore corrupted cookie files
    }
  }

  return context
}

export async function saveCookies(context: BrowserContext, platform: PlatformName): Promise<void> {
  ensureDir(COOKIES_DIR)
  const cookiePath = path.join(COOKIES_DIR, `${platform}.json`)
  const cookies = await context.cookies()
  fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2))
}

export async function screenshot(page: Page, name: string): Promise<string> {
  ensureDir(SCREENSHOTS_DIR)
  const filepath = path.join(SCREENSHOTS_DIR, `${name}_${Date.now()}.png`)
  await page.screenshot({ path: filepath, fullPage: true })
  return filepath
}

export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 10000 })
  await page.click(selector)
  await page.fill(selector, value)
}

export async function selectOption(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  await page.waitForSelector(selector, { timeout: 10000 })
  await page.selectOption(selector, value)
}

export async function uploadFile(
  page: Page,
  selector: string,
  filePath: string,
): Promise<void> {
  await page.waitForSelector(selector, { timeout: 10000 })
  await page.setInputFiles(selector, filePath)
}

export async function waitAndClick(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 10000 })
  await page.click(selector)
}
