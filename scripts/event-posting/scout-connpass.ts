import 'dotenv/config'
import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const SCREENSHOTS_DIR = path.join(process.cwd(), 'temp', 'screenshots')
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

async function scout() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()

  try {
    // Login
    await page.goto('https://connpass.com/login/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await page.fill('input[name="username"].gray_form', process.env.CONNPASS_EMAIL!)
    await page.fill('input[name="password"].gray_form', process.env.CONNPASS_PASSWORD!)
    await page.click('button.btn_login.btn_default')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(5000)
    console.log(`Logged in: ${page.url()}`)

    // Go to editmanage
    await page.goto('https://connpass.com/editmanage/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // Click EventCreateButton via JS
    console.log('=== Clicking EventCreateButton ===')
    await page.evaluate(() => {
      const btn = document.getElementById('EventCreateButton')
      if (btn) btn.click()
    })
    await page.waitForTimeout(3000)

    // Screenshot the modal
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'connpass_40_modal.png'), fullPage: false })

    // Dump the popup/modal structure
    const modalInfo = await page.evaluate(() => {
      const popups = document.querySelectorAll('.popup, .jqmWindow, [class*="popup"], [class*="modal"]')
      const results: Record<string, unknown>[] = []

      popups.forEach((popup) => {
        const style = window.getComputedStyle(popup)
        const isVisible = style.display !== 'none' && style.visibility !== 'hidden'
        results.push({
          tag: popup.tagName,
          class: popup.className?.toString().substring(0, 100),
          id: popup.id,
          visible: isVisible,
          innerHTML: isVisible ? popup.innerHTML.substring(0, 500) : '(hidden)',
          children: isVisible ? Array.from(popup.querySelectorAll('input, button, a, textarea, select')).map((el) => ({
            tag: el.tagName,
            type: (el as HTMLInputElement).type || '',
            name: (el as HTMLInputElement).name || '',
            id: el.id || '',
            class: el.className?.toString().substring(0, 80) || '',
            text: el.textContent?.trim().substring(0, 60) || '',
            value: (el as HTMLInputElement).value || '',
          })) : [],
        })
      })

      return results
    })

    console.log(`\nPopup elements: ${modalInfo.length}`)
    modalInfo.forEach((m) => {
      console.log(`\n  ${m.tag} class="${m.class}" id="${m.id}" visible=${m.visible}`)
      if (m.visible) {
        console.log(`  innerHTML: ${(m.innerHTML as string).substring(0, 300)}`)
        const children = m.children as Record<string, string>[]
        children.forEach((c) => console.log(`    ${c.tag} type=${c.type} name="${c.name}" id="${c.id}" text="${c.text}" class="${c.class}"`))
      }
    })

  } catch (e) {
    console.error('Error:', e)
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'connpass_error.png'), fullPage: true })
  } finally {
    await context.close()
    await browser.close()
  }
}

scout().catch(console.error)
