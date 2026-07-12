/**
 * GA4 Data API 診断レポート — 3DLab 予約ファネル
 *
 * 「予約ゼロ/低調」の原因を切り分けるための日次レポートを生成する。
 *   1. 今日 vs 直近7日平均: 集客が落ちたか即判定
 *   2. 日次トレンド(直近N日): sessions / activeUsers / pageViews
 *   3. ファネル(直近N日): view_item → add_to_cart → begin_checkout → purchase の段階減衰
 *   4. 構造シグナル: ws_availability_full(満席) / ws_request_only_view(決済導線なし)
 *   5. 今日の流入元 / ランディングページ
 *
 * 出力: outputs/ga4-report-<date>.md ＋ 標準出力に要約。
 *
 * 認証: kpi-hub と同じ OAuth を流用（サービスアカウント不要）。
 *   .env に GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN の3点を設定
 *   （kpi-hub の .env.local からコピー）。プロパティIDは measurement ID から
 *   自動解決するため通常は不要（明示するなら GA4_PROPERTY_ID）。
 *
 * 実行: npm run ga4:report            (直近30日 / 対象=今日)
 *       npm run ga4:report -- --days 60
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
const DAYS = Math.max(1, parseInt(argVal('days', '30'), 10) || 30)

// ---- 認証（OAuth: kpi-hub 流用） -----------------------------------------
function getOAuth() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!id || !secret || !refresh) {
    console.error(
      [
        '✗ GOOGLE_OAUTH_* が未設定です（kpi-hub の OAuth を流用します）。',
        '',
        'kpi-hub/.env.local から以下3点を 3dworkshop/.env にコピー:',
        '  GOOGLE_OAUTH_CLIENT_ID=...',
        '  GOOGLE_OAUTH_CLIENT_SECRET=...',
        '  GOOGLE_OAUTH_REFRESH_TOKEN=...',
        '',
        '（プロパティIDは measurement ID から自動解決。明示する場合のみ GA4_PROPERTY_ID）',
      ].join('\n'),
    )
    process.exit(1)
  }
  const client = new google.auth.OAuth2(id, secret)
  client.setCredentials({ refresh_token: refresh })
  return client
}

const auth = getOAuth()
const adminApi = google.analyticsadmin({ version: 'v1beta', auth })
const dataApi = google.analyticsdata({ version: 'v1beta', auth: auth as never })

// measurement ID → 数値プロパティID を解決（GA4_PROPERTY_ID 明示時はそれを優先）
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
      for (const s of ds.data.dataStreams ?? []) {
        if (s.webStreamData?.measurementId === GA_MEASUREMENT_ID) {
          return property.replace('properties/', '')
        }
      }
    } catch {
      /* no access to this property's streams → skip */
    }
  }
  throw new Error(
    `measurement ID ${GA_MEASUREMENT_ID} を含む GA4 プロパティが見つかりません（OAuth アカウントに閲覧権限が無い可能性）`,
  )
}

// ---- レポート実行 --------------------------------------------------------
type Row = { dims: string[]; metrics: number[] }

async function run(
  property: string,
  opts: {
    dimensions?: string[]
    metrics: string[]
    startDate: string
    endDate: string
    eventNames?: string[]
    orderByDim?: string
    limit?: number
  },
): Promise<Row[]> {
  const res = await dataApi.properties.runReport({
    property: `properties/${property}`,
    requestBody: {
      dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
      dimensions: (opts.dimensions ?? []).map(name => ({ name })),
      metrics: opts.metrics.map(name => ({ name })),
      ...(opts.eventNames
        ? {
            dimensionFilter: {
              filter: {
                fieldName: 'eventName',
                inListFilter: { values: opts.eventNames },
              },
            },
          }
        : {}),
      ...(opts.orderByDim
        ? { orderBys: [{ dimension: { dimensionName: opts.orderByDim } }] }
        : {}),
      limit: String(opts.limit ?? 10000),
    },
  })
  return (res.data.rows ?? []).map(r => ({
    dims: (r.dimensionValues ?? []).map(d => d.value ?? ''),
    metrics: (r.metricValues ?? []).map(m => Number(m.value ?? 0)),
  }))
}

function fmt(n: number): string {
  return n.toLocaleString('en-US')
}
function pct(num: number, den: number): string {
  if (!den) return '—'
  return `${((num / den) * 100).toFixed(1)}%`
}
function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function gaDateToIso(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

async function main() {
  const propertyId = await resolvePropertyId()

  const out: string[] = []
  const log = (s = '') => {
    out.push(s)
    console.log(s)
  }

  log(`# GA4 予約ファネル診断レポート`)
  log(``)
  log(`- 生成: ${new Date().toISOString()}`)
  log(`- プロパティ: ${propertyId} (${GA_MEASUREMENT_ID})`)
  log(`- 期間: 直近 ${DAYS} 日`)
  log(``)

  // 1) 日次トレンド ---------------------------------------------------------
  const daily = await run(propertyId, {
    dimensions: ['date'],
    metrics: ['sessions', 'activeUsers', 'screenPageViews'],
    startDate: `${DAYS - 1}daysAgo`,
    endDate: 'today',
    orderByDim: 'date',
  })

  const today = todayIso()
  // GA4 の date 次元は当日(部分日)を省くことがあるため、当日合計は today..today で明示取得
  const todayTotals = await run(propertyId, {
    metrics: ['sessions', 'activeUsers', 'screenPageViews'],
    startDate: 'today',
    endDate: 'today',
  })
  const todayMetrics = todayTotals[0]?.metrics ?? [0, 0, 0]
  // 平常比は「当日を除いた直近7日(完了日)」を基準にする
  const prior = daily.filter(r => gaDateToIso(r.dims[0]) !== today).slice(-7)
  const avg = (idx: number) =>
    prior.length ? prior.reduce((s, r) => s + r.metrics[idx], 0) / prior.length : 0

  log(`## 1. 今日 vs 直近7日平均（今日は集計途中の部分日）`)
  log(``)
  log(`| 指標 | 今日(途中) | 7日平均 | 判定 |`)
  log(`|---|---:|---:|---|`)
  const labels = ['セッション', 'ユーザー', 'ページビュー']
  labels.forEach((label, i) => {
    const t = todayMetrics[i] ?? 0
    const a = avg(i)
    const verdict = a === 0 ? '—' : t < a * 0.5 ? '⚠️ 半減以下' : t < a * 0.8 ? '↓ 低調' : '≈ 通常'
    log(`| ${label} | ${fmt(t)} | ${a.toFixed(1)} | ${verdict} |`)
  })
  log(``)
  log(`※ 「今日」は実行時点までの部分日。1日通した平均との単純比較は割り引いて読む。`)
  log(``)

  log(`## 2. 日次トレンド（直近 ${DAYS} 日）`)
  log(``)
  log(`| 日付 | セッション | ユーザー | PV |`)
  log(`|---|---:|---:|---:|`)
  daily.forEach(r => {
    log(`| ${gaDateToIso(r.dims[0])} | ${fmt(r.metrics[0])} | ${fmt(r.metrics[1])} | ${fmt(r.metrics[2])} |`)
  })
  log(``)

  // 3) ファネル総計 ---------------------------------------------------------
  const FUNNEL = ['view_item_list', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase']
  const SIGNALS = ['ws_availability_full', 'ws_request_only_view', 'ws_request_submit', 'ws_booking_error']
  const events = await run(propertyId, {
    dimensions: ['eventName'],
    metrics: ['eventCount'],
    startDate: `${DAYS - 1}daysAgo`,
    endDate: 'today',
    eventNames: [...FUNNEL, ...SIGNALS],
  })
  const evCount = (name: string) =>
    events.find(r => r.dims[0] === name)?.metrics[0] ?? 0

  const viewItem = evCount('view_item')
  const beginCheckout = evCount('begin_checkout')
  const purchase = evCount('purchase')

  log(`## 3. 予約ファネル（直近 ${DAYS} 日・イベント総数）`)
  log(``)
  log(`| 段階 | イベント | 回数 | 直前段階からのCVR |`)
  log(`|---|---|---:|---:|`)
  log(`| 一覧閲覧 | view_item_list | ${fmt(evCount('view_item_list'))} | — |`)
  log(`| 詳細閲覧 | view_item | ${fmt(viewItem)} | — |`)
  log(`| 予約開始 | add_to_cart | ${fmt(evCount('add_to_cart'))} | ${pct(evCount('add_to_cart'), viewItem)} |`)
  log(`| 決済へ | begin_checkout | ${fmt(beginCheckout)} | ${pct(beginCheckout, viewItem)} |`)
  log(`| 予約完了 | purchase | ${fmt(purchase)} | ${pct(purchase, beginCheckout)} |`)
  log(``)
  log(`- 詳細閲覧→予約完了の総合CVR: **${pct(purchase, viewItem)}**`)
  log(``)

  log(`## 4. 構造シグナル（直近 ${DAYS} 日）`)
  log(``)
  log(`| シグナル | 回数 | 意味 |`)
  log(`|---|---:|---|`)
  log(`| ws_availability_full | ${fmt(evCount('ws_availability_full'))} | 満席表示を見た回数（需要はあるが枠なし） |`)
  log(`| ws_request_only_view | ${fmt(evCount('ws_request_only_view'))} | 決済導線なし(リクエストのみ)の閲覧（構造的ゼロ） |`)
  log(`| ws_request_submit | ${fmt(evCount('ws_request_submit'))} | 開催リクエスト送信 |`)
  log(`| ws_booking_error | ${fmt(evCount('ws_booking_error'))} | 予約処理エラー |`)
  log(``)

  // 5) 今日の流入元 / ランディング -----------------------------------------
  const srcMedium = await run(propertyId, {
    dimensions: ['sessionSourceMedium'],
    metrics: ['sessions'],
    startDate: 'today',
    endDate: 'today',
    limit: 10,
  })
  const landing = await run(propertyId, {
    dimensions: ['landingPage'],
    metrics: ['sessions'],
    startDate: 'today',
    endDate: 'today',
    limit: 10,
  })

  log(`## 5. 今日の流入元 Top10`)
  log(``)
  log(`| source / medium | セッション |`)
  log(`|---|---:|`)
  srcMedium.sort((a, b) => b.metrics[0] - a.metrics[0]).forEach(r => {
    log(`| ${r.dims[0]} | ${fmt(r.metrics[0])} |`)
  })
  if (srcMedium.length === 0) log(`| (今日の流入なし) | 0 |`)
  log(``)

  log(`## 6. 今日のランディングページ Top10`)
  log(``)
  log(`| ランディングページ | セッション |`)
  log(`|---|---:|`)
  landing.sort((a, b) => b.metrics[0] - a.metrics[0]).forEach(r => {
    log(`| ${r.dims[0]} | ${fmt(r.metrics[0])} |`)
  })
  if (landing.length === 0) log(`| (今日の流入なし) | 0 |`)
  log(``)

  // ---- 自動所見 ----------------------------------------------------------
  log(`## 所見（自動）`)
  log(``)
  // 集客判定は「当日(部分日)」ではなく直近の完了日で行う（apples-to-apples）
  const completed = daily.filter(r => gaDateToIso(r.dims[0]) !== today)
  const lastDay = completed[completed.length - 1]
  const base7 = completed.slice(-8, -1) // 直近完了日の前7日
  const baseAvg = base7.length
    ? base7.reduce((s, r) => s + r.metrics[0], 0) / base7.length
    : 0
  const lastSessions = lastDay?.metrics[0] ?? 0

  if (viewItem > 0 && purchase === 0) {
    log(`- ⚠️ 詳細閲覧はあるのに purchase が0。**離脱(コンバージョン)側**。add_to_cart/begin_checkout の段階減衰を確認。`)
  } else if (evCount('ws_availability_full') > 0 && viewItem > 0 && beginCheckout === 0) {
    log(`- ⚠️ 満席表示が多く決済開始が0。**枠不足(満席)**が主因の可能性。新規セッション枠の追加を検討。`)
  } else if (evCount('ws_request_only_view') > viewItem && viewItem >= 0 && evCount('ws_request_only_view') > 0) {
    log(`- ⚠️ 決済導線なし(リクエストのみ)の閲覧が多い。**構造的ゼロ**（予約可能な開催日が不足）。開催日程を追加。`)
  } else if (lastDay && baseAvg > 0 && lastSessions < baseAvg * 0.6) {
    log(`- ⚠️ 直近の完了日 ${gaDateToIso(lastDay.dims[0])} のセッションが ${fmt(lastSessions)}（前7日平均 ${baseAvg.toFixed(0)} の ${pct(lastSessions, baseAvg)}）。**集客側の低下傾向**。流入元Top10・SEO順位・広告/SNSを点検。`)
  } else {
    log(`- 集客の完了日トレンドに極端な異常は検出されず。ファネル計測はデプロイ後に蓄積される。`)
  }
  log(``)
  log(`- ファネル計測が全て0の場合は、まだ本番デプロイされていない（イベント未収集）。デプロイ後の日から段階減衰が見える。`)
  log(``)
  log(`> 注: GA イベントは計測実装(デプロイ)以降のみ。それ以前の日はファネル値が0になる（集客トレンドは過去分も取得可）。`)

  // ---- 保存 --------------------------------------------------------------
  const dir = path.join(process.cwd(), 'outputs')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `ga4-report-${today}.md`)
  fs.writeFileSync(file, out.join('\n'), 'utf-8')
  console.log(`\n✓ 保存: ${file}`)
}

main().catch(err => {
  console.error('✗ レポート生成に失敗:', err?.message || err)
  process.exit(1)
})
