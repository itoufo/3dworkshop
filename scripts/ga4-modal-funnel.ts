/**
 * GA4 予約モーダル内部ファネル 深掘りレポート
 *
 * 「add_to_cart(モーダルを開く) → begin_checkout(送信) の離脱」を分解する。
 *   1. モーダル内部ファネル: view_item → add_to_cart → ws_form_start → begin_checkout → purchase
 *   2. デバイス別（PC/モバイルで到達率が違う）
 *   3. 離脱の閉じ方: ws_booking_modal_abandon × method（×/背景/Esc）
 *   4. クーポン: ws_coupon_apply × valid（無効コード連打の可視化）
 *   5. エラー: ws_booking_error × step
 *   6. ランディング別（どのWSで開始/完了しているか）
 *   7. 所見（自動）
 *
 * 認証: ga4-report と同じ OAuth を流用（read-only可・.env の GOOGLE_OAUTH_*）。
 *       property は measurement ID から自動解決（明示は任意 GA4_PROPERTY_ID）。
 * 実行: npm run ga4:modal            (直近14日)
 *       npm run ga4:modal -- --days 30
 * 出力: outputs/ga4-modal-funnel-<date>.md ＋ 標準出力
 *
 * 注: method/valid/step は 2026-07-20 に登録した GA4 カスタムディメンション(EVENT範囲)。
 *     カスタムディメンションは遡及しないため、それ以前の日付の内訳は空になる。
 *     ws_form_start も計測実装デプロイ(〜2026-07-18/19)以降のみ。
 */

import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { GA_MEASUREMENT_ID } from '../lib/gtag'

dotenv.config()

// ---- 引数 ----------------------------------------------------------------
function argVal(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1]
  return fallback
}
const DAYS = Math.max(1, parseInt(argVal('days', '14'), 10) || 14)

// ---- 認証（OAuth: ga4-report と共通） ------------------------------------
function getOAuth() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!id || !secret || !refresh) {
    console.error('✗ GOOGLE_OAUTH_* が未設定です（ga4-report と同じ .env を使用）。')
    process.exit(1)
  }
  const client = new google.auth.OAuth2(id, secret)
  client.setCredentials({ refresh_token: refresh })
  return client
}

const auth = getOAuth()
const adminApi = google.analyticsadmin({ version: 'v1beta', auth })
const dataApi = google.analyticsdata({ version: 'v1beta', auth: auth as never })

async function resolvePropertyId(): Promise<string> {
  if (process.env.GA4_PROPERTY_ID) return String(process.env.GA4_PROPERTY_ID)
  const accs = await adminApi.accountSummaries.list({ pageSize: 200 })
  const props: string[] = []
  for (const a of accs.data.accountSummaries ?? [])
    for (const p of a.propertySummaries ?? [])
      if (p.property) props.push(p.property)
  for (const property of props) {
    try {
      const ds = await adminApi.properties.dataStreams.list({ parent: property })
      for (const s of ds.data.dataStreams ?? [])
        if (s.webStreamData?.measurementId === GA_MEASUREMENT_ID)
          return property.replace('properties/', '')
    } catch {
      /* このプロパティのstreamに権限なし → skip */
    }
  }
  throw new Error(`measurement ID ${GA_MEASUREMENT_ID} を含む GA4 プロパティが見つかりません`)
}

// ---- レポート実行 --------------------------------------------------------
type Row = { dims: string[]; n: number }
async function run(property: string, body: Record<string, unknown>): Promise<Row[]> {
  const res = await dataApi.properties.runReport({
    property: `properties/${property}`,
    requestBody: {
      dateRanges: [{ startDate: `${DAYS - 1}daysAgo`, endDate: 'today' }],
      ...body,
    },
  })
  return (res.data.rows ?? []).map(r => ({
    dims: (r.dimensionValues ?? []).map(d => d.value ?? ''),
    n: Number(r.metricValues?.[0]?.value ?? 0),
  }))
}

const out: string[] = []
const log = (s = '') => {
  out.push(s)
  console.log(s)
}
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—')

// eventName を指定して customEvent:<param> 別に eventCount を割る
async function breakdown(property: string, eventName: string, param: string): Promise<Row[]> {
  try {
    return await run(property, {
      dimensions: [{ name: `customEvent:${param}` }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: [eventName] } } },
    })
  } catch (e) {
    return [{ dims: [`__ERROR__ ${(e as Error).message?.slice(0, 80)}`], n: 0 }]
  }
}

function printBreakdown(rows: Row[]) {
  const real = rows.filter(r => !r.dims[0].startsWith('__ERROR__'))
  if (rows[0]?.dims[0]?.startsWith('__ERROR__')) {
    log(`  ⚠️ ${rows[0].dims[0].replace('__ERROR__ ', '')}（カスタム定義未登録の可能性）`)
    return
  }
  if (real.length === 0) {
    log('  (データなし — カスタム定義は 2026-07-20 以降しか蓄積しない)')
    return
  }
  let hasNotSet = false
  for (const r of real.sort((a, b) => b.n - a.n)) {
    const label = r.dims[0] || '(not set)'
    if (label === '(not set)') hasNotSet = true
    log(`  ${label.padEnd(16)} ${r.n}`)
  }
  if (hasNotSet) log('  ※ (not set) は登録前(2026-07-20以前)のイベント。実値の内訳は07-20以降に蓄積される。')
}

async function main() {
  const property = await resolvePropertyId()
  const today = new Date().toISOString().slice(0, 10)

  log(`# GA4 予約モーダル内部ファネル（直近${DAYS}日 / property ${property} / ${today}）`)
  log('')

  // 1. eventCount ファネル
  const EVENTS = [
    'view_item', 'add_to_cart', 'ws_form_start', 'ws_session_select',
    'ws_coupon_apply', 'ws_booking_modal_abandon', 'begin_checkout', 'ws_booking_error', 'purchase',
  ]
  const ev = await run(property, {
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: EVENTS } } },
  })
  const m = new Map(ev.map(r => [r.dims[0], r.n]))
  const g = (e: string) => m.get(e) ?? 0

  log('## 1. モーダル内部ファネル（eventCount）')
  log('')
  log('| 段階 | イベント | 回数 | 前段CVR |')
  log('|---|---|---:|---:|')
  log(`| 詳細閲覧 | view_item | ${g('view_item')} | — |`)
  log(`| 予約開始(モーダル開) | add_to_cart | ${g('add_to_cart')} | ${pct(g('add_to_cart'), g('view_item'))} |`)
  log(`| 入力着手 | ws_form_start | ${g('ws_form_start')} | ${pct(g('ws_form_start'), g('add_to_cart'))} |`)
  log(`| 決済へ | begin_checkout | ${g('begin_checkout')} | ${pct(g('begin_checkout'), g('ws_form_start'))} |`)
  log(`| 予約完了 | purchase | ${g('purchase')} | ${pct(g('purchase'), g('begin_checkout'))} |`)
  log('')
  log(`- 明示クローズ modal_abandon: ${g('ws_booking_modal_abandon')} / クーポン試行: ${g('ws_coupon_apply')} / エラー: ${g('ws_booking_error')} / 日程選択: ${g('ws_session_select')}`)
  log('')

  // 2. デバイス別
  const DEV_EVENTS = ['add_to_cart', 'ws_form_start', 'begin_checkout', 'purchase', 'ws_booking_modal_abandon']
  const dev = await run(property, {
    dimensions: [{ name: 'deviceCategory' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: DEV_EVENTS } } },
  })
  log('## 2. デバイス別')
  log('')
  const devMap = new Map<string, Map<string, number>>()
  for (const r of dev) {
    if (!devMap.has(r.dims[0])) devMap.set(r.dims[0], new Map())
    devMap.get(r.dims[0])!.set(r.dims[1], r.n)
  }
  log('| デバイス | add_to_cart | ws_form_start | begin_checkout | purchase | abandon |')
  log('|---|---:|---:|---:|---:|---:|')
  for (const [d, mm] of [...devMap.entries()].sort()) {
    const c = (k: string) => mm.get(k) ?? 0
    log(`| ${d} | ${c('add_to_cart')} | ${c('ws_form_start')} | ${c('begin_checkout')} | ${c('purchase')} | ${c('ws_booking_modal_abandon')} |`)
  }
  log('')

  // 3. 離脱の閉じ方
  log('## 3. 離脱の閉じ方（ws_booking_modal_abandon × method）')
  log('')
  printBreakdown(await breakdown(property, 'ws_booking_modal_abandon', 'method'))
  log('')

  // 4. クーポン成否
  log('## 4. クーポン試行の成否（ws_coupon_apply × valid）')
  log('')
  printBreakdown(await breakdown(property, 'ws_coupon_apply', 'valid'))
  log('')

  // 5. エラー段階
  log('## 5. 予約エラーの段階（ws_booking_error × step）')
  log('')
  printBreakdown(await breakdown(property, 'ws_booking_error', 'step'))
  log('')

  // 6. ランディング別
  const pg = await run(property, {
    dimensions: [{ name: 'pagePath' }, { name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['add_to_cart', 'begin_checkout'] } } },
  })
  log('## 6. ランディング別 add_to_cart / begin_checkout')
  log('')
  const pageMap = new Map<string, { a: number; b: number }>()
  for (const r of pg) {
    const cur = pageMap.get(r.dims[0]) ?? { a: 0, b: 0 }
    if (r.dims[1] === 'add_to_cart') cur.a += r.n
    else cur.b += r.n
    pageMap.set(r.dims[0], cur)
  }
  for (const [p, v] of [...pageMap.entries()].filter(([, v]) => v.a > 0 || v.b > 0).sort((x, y) => y[1].a - x[1].a))
    log(`- add=${String(v.a).padStart(3)} chk=${String(v.b).padStart(3)}  ${p}`)
  log('')

  // 7. 所見
  log('## 7. 所見（自動）')
  log('')
  const openN = g('add_to_cart'), formN = g('ws_form_start'), chkN = g('begin_checkout')
  if (openN === 0) {
    log('- add_to_cart が0。モーダルを開いたユーザーがいない（計測未反映 or 対象期間に予約意図なし）。')
  } else if (chkN > formN) {
    log(`- ⚠️ ws_form_start(${formN}) < begin_checkout(${chkN}) は論理矛盾。ws_form_start の計測が新しく対象期間で日数不足のため、入力着手率は**まだ信頼できない**。両イベントの収集期間が揃う数日後に再実行して判定する。`)
  } else if (formN / openN < 0.4) {
    log(`- **開いて即離脱が主因**（入力着手率 ${pct(formN, openN)}）。モーダル冒頭の価格・訴求・日程訴求を見直す余地。`)
  } else if (formN > 0 && chkN / formN < 0.4) {
    log(`- **入力後・送信手前で離脱**（送信到達率 ${pct(chkN, formN)}）。フォーム摩擦（電話必須・学年入力など）や最終金額での躊躇を疑う。`)
  } else {
    log('- 入力着手・送信到達とも大きな崩れなし。begin_checkout→purchase(Stripe側)の減衰を別途確認。')
  }
  log('- 内訳(method/valid/step)が「データなし」の場合は 2026-07-20 のカスタム定義登録日以降を待つ。')
  log('')

  // 保存
  const dir = path.join(process.cwd(), 'outputs')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `ga4-modal-funnel-${today}.md`)
  fs.writeFileSync(file, out.join('\n'))
  console.log(`\n✓ 保存: ${file}`)
}

main().catch(e => {
  console.error('FATAL', (e as Error).message)
  process.exit(1)
})
