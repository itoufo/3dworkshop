/**
 * Google広告 観測レポート（GA4 Data API 経由・追加トークン不要）
 *
 * GA4↔Google広告リンク(customerId 3034613886)のコストデータを使い、
 * キャンペーン / キーワード / 実検索語 別に コスト・クリック・CV・CPA・ROAS を出す。
 * 「どのKWが刈れているか」「消化してCV0の停止候補」「無駄な検索語(除外候補)」を可視化。
 *
 * 認証は ga4-report と同じ（.env の GOOGLE_OAUTH_* を kpi-hub からコピー済み）。
 * ※ 広告費は翌日反映。開始直後はデータ0（正常）。
 *
 * 実行: npm run ads:report            (直近30日)
 *       npm run ads:report -- --days 7
 */

import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { GA_MEASUREMENT_ID } from '../lib/gtag'

dotenv.config()

function argVal(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1]
  return fallback
}
const DAYS = Math.max(1, parseInt(argVal('days', '30'), 10) || 30)
const CPA_TARGET = 3000

function getOAuth() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!id || !secret || !refresh) {
    console.error('✗ GOOGLE_OAUTH_* が未設定（kpi-hub の3点を .env にコピー）')
    process.exit(1)
  }
  const c = new google.auth.OAuth2(id, secret)
  c.setCredentials({ refresh_token: refresh })
  return c
}

const auth = getOAuth()
const adminApi = google.analyticsadmin({ version: 'v1beta', auth })
const dataApi = google.analyticsdata({ version: 'v1beta', auth: auth as never })

async function resolvePropertyId(): Promise<string> {
  if (process.env.GA4_PROPERTY_ID) return String(process.env.GA4_PROPERTY_ID)
  const accs = await adminApi.accountSummaries.list({ pageSize: 200 })
  for (const a of accs.data.accountSummaries ?? [])
    for (const p of a.propertySummaries ?? []) {
      if (!p.property) continue
      try {
        const ds = await adminApi.properties.dataStreams.list({ parent: p.property })
        for (const s of ds.data.dataStreams ?? [])
          if (s.webStreamData?.measurementId === GA_MEASUREMENT_ID) return p.property.replace('properties/', '')
      } catch { /* skip */ }
    }
  throw new Error(`measurement ID ${GA_MEASUREMENT_ID} のプロパティが見つからない`)
}

// 広告メトリクスは Google広告ディメンションと必ずセットで取得
const METRICS = ['advertiserAdCost', 'advertiserAdClicks', 'advertiserAdImpressions', 'keyEvents', 'purchaseRevenue']
type Row = { name: string; cost: number; clicks: number; impr: number; conv: number; rev: number }

async function byDimension(property: string, dimension: string): Promise<Row[]> {
  const res = await dataApi.properties.runReport({
    property: `properties/${property}`,
    requestBody: {
      dateRanges: [{ startDate: `${DAYS - 1}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: dimension }],
      metrics: METRICS.map(name => ({ name })),
      limit: '100',
    },
  })
  return (res.data.rows ?? []).map(r => ({
    name: r.dimensionValues?.[0]?.value ?? '(not set)',
    cost: Number(r.metricValues?.[0]?.value ?? 0),
    clicks: Number(r.metricValues?.[1]?.value ?? 0),
    impr: Number(r.metricValues?.[2]?.value ?? 0),
    conv: Number(r.metricValues?.[3]?.value ?? 0),
    rev: Number(r.metricValues?.[4]?.value ?? 0),
  }))
}

const yen = (n: number) => '¥' + Math.round(n).toLocaleString('en-US')
const cpa = (r: Row) => (r.conv > 0 ? yen(r.cost / r.conv) : '—')
const roas = (r: Row) => (r.cost > 0 ? (r.rev / r.cost).toFixed(2) + 'x' : '—')
function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main() {
  const property = await resolvePropertyId()
  const out: string[] = []
  const log = (s = '') => { out.push(s); console.log(s) }

  const campaigns = await byDimension(property, 'sessionGoogleAdsCampaignName')
  const keywords = await byDimension(property, 'sessionGoogleAdsKeyword')
  const queries = await byDimension(property, 'sessionGoogleAdsQuery')

  const paid = campaigns.filter(c => c.cost > 0 || c.clicks > 0)
  const totCost = paid.reduce((s, r) => s + r.cost, 0)
  const totConv = paid.reduce((s, r) => s + r.conv, 0)
  const totClicks = paid.reduce((s, r) => s + r.clicks, 0)
  const totRev = paid.reduce((s, r) => s + r.rev, 0)

  log(`# Google広告 観測レポート`)
  log(``)
  log(`- 生成: ${new Date().toISOString()} / 期間: 直近${DAYS}日 / 目標CPA: ${yen(CPA_TARGET)}`)
  log(``)

  if (totCost === 0 && totClicks === 0) {
    log(`> まだ広告費・クリックが計上されていません。`)
    log(`> 開始直後、または費用は翌日反映のため。広告が回り始めれば翌日以降ここに数字が出ます。`)
  } else {
    log(`## サマリ`)
    log(`- コスト ${yen(totCost)} / クリック ${totClicks} / 予約(CV) ${totConv} / 売上 ${yen(totRev)}`)
    log(`- **CPA ${totConv > 0 ? yen(totCost / totConv) : '—'}**（目標${yen(CPA_TARGET)}） / **ROAS ${totCost > 0 ? (totRev / totCost).toFixed(2) + 'x' : '—'}**`)
    log(``)

    log(`## キャンペーン別`)
    log(`| キャンペーン | コスト | クリック | CV | CPA | ROAS |`)
    log(`|---|--:|--:|--:|--:|--:|`)
    for (const r of paid.sort((a, b) => b.cost - a.cost))
      log(`| ${r.name} | ${yen(r.cost)} | ${r.clicks} | ${r.conv} | ${cpa(r)} | ${roas(r)} |`)
    log(``)

    log(`## キーワード別（CV順 / コスト順）`)
    log(`| キーワード | コスト | クリック | CV | CPA |`)
    log(`|---|--:|--:|--:|--:|`)
    for (const r of keywords.filter(k => k.cost > 0 || k.clicks > 0).sort((a, b) => b.conv - a.conv || b.cost - a.cost).slice(0, 30))
      log(`| ${r.name} | ${yen(r.cost)} | ${r.clicks} | ${r.conv} | ${cpa(r)} |`)
    log(``)

    log(`## 実際の検索語 Top（除外KW発掘用）`)
    log(`| 検索語 | コスト | クリック | CV |`)
    log(`|---|--:|--:|--:|`)
    for (const r of queries.filter(q => q.cost > 0 || q.clicks > 0).sort((a, b) => b.cost - a.cost).slice(0, 30))
      log(`| ${r.name} | ${yen(r.cost)} | ${r.clicks} | ${r.conv} |`)
    log(``)

    // 所見
    log(`## 所見（自動）`)
    const kill = keywords.filter(k => k.cost >= CPA_TARGET && k.conv === 0)
    const scale = keywords.filter(k => k.conv > 0 && k.cost / k.conv < CPA_TARGET)
    if (kill.length) log(`- ⛔ 停止候補（${yen(CPA_TARGET)}以上消化しCV0）: ${kill.map(k => k.name).join(' / ')}`)
    if (scale.length) log(`- 📈 拡大候補（CPA<${yen(CPA_TARGET)}）: ${scale.map(k => `${k.name}(${yen(k.cost / k.conv)})`).join(' / ')}`)
    if (totConv > 0 && totCost / totConv > CPA_TARGET * 1.5) log(`- ⚠️ 全体CPAが目標の1.5倍超。低CPAのKWへ寄せ、消化KWを停止。`)
    if (!kill.length && !scale.length) log(`- まだ判断に足るデータ量ではない。数日〜1週間ためて再評価。`)
  }

  const dir = path.join(process.cwd(), 'outputs')
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `ads-report-${todayIso()}.md`)
  fs.writeFileSync(file, out.join('\n'), 'utf-8')
  console.log(`\n✓ 保存: ${file}`)
}

main().catch(e => { console.error('✗ 失敗:', e?.message || e); process.exit(1) })
