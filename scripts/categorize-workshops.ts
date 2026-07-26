/**
 * 同名ワークショップ一括カテゴリ化スクリプト
 *
 * 同名・類似タイトルのワークショップを自動検出し、
 * workshop_categoriesを一括作成・workshopsのcategory_idを割り当てる。
 *
 * Usage:
 *   npx tsx scripts/categorize-workshops.ts          # ドライラン（プレビューのみ）
 *   npx tsx scripts/categorize-workshops.ts --apply   # 実際にDB変更
 *   npx tsx scripts/categorize-workshops.ts --include-singles  # 1件のみも含む
 *   npx tsx scripts/categorize-workshops.ts --min-group-size 3 # 最小グループサイズ変更
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

// --- CLI引数パース ---
const args = process.argv.slice(2)
const applyMode = args.includes('--apply')
const includeSingles = args.includes('--include-singles')
const minGroupSizeIdx = args.indexOf('--min-group-size')
const minGroupSize = minGroupSizeIdx !== -1
  ? parseInt(args[minGroupSizeIdx + 1], 10) || 2
  : (includeSingles ? 1 : 2)

// --- Supabase初期化（service roleキー） ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// --- 日本語→英語 簡易マッピング辞書 ---
const SLUG_DICT: Record<string, string> = {
  '入門': 'intro',
  '体験': 'experience',
  'モデリング': 'modeling',
  'プリンター': 'printer',
  'プリント': 'print',
  'スキャナー': 'scanner',
  'スキャン': 'scan',
  'ワークショップ': 'workshop',
  '初心者': 'beginner',
  '初級': 'beginner',
  '中級': 'intermediate',
  '上級': 'advanced',
  '基礎': 'basic',
  '応用': 'applied',
  '実践': 'practice',
  'デザイン': 'design',
  'アート': 'art',
  'フィギュア': 'figure',
  'ジュエリー': 'jewelry',
  'アクセサリー': 'accessory',
  'ペン': 'pen',
  'カスタマイズ': 'customize',
  'オリジナル': 'original',
  'レーザー': 'laser',
  'カッター': 'cutter',
  'データ': 'data',
  '作成': 'create',
  '制作': 'create',
  '講座': 'course',
  '教室': 'class',
  'キャラクター': 'character',
  'ミニチュア': 'miniature',
  'インテリア': 'interior',
  '雑貨': 'goods',
  'クリスマス': 'christmas',
  'バレンタイン': 'valentine',
  'ハロウィン': 'halloween',
  'お正月': 'newyear',
  '親子': 'family',
  '子供': 'kids',
  'こども': 'kids',
  'キッズ': 'kids',
  '夏休み': 'summer',
  '冬休み': 'winter',
  '春休み': 'spring',
  'マスター': 'master',
  'ブレンダー': 'blender',
  'Blender': 'blender',
  'ZBrush': 'zbrush',
  'Fusion': 'fusion',
  'CAD': 'cad',
  'レジン': 'resin',
  'シリコン': 'silicone',
  '型取り': 'molding',
  '塗装': 'painting',
  '仕上げ': 'finishing',
  'お試し': 'trial',
  'トライアル': 'trial',
  '搭載': '',
  '向け': '',
  '経営者': 'executive',
  '作品': 'work',
  '作り': '',
  '作ろう': '',
  'つくろう': '',
  'オンライン': 'online',
  'ウェビナー': 'webinar',
  '時代': 'era',
  '子育て': 'parenting',
  'コツ': 'tips',
}

// --- 丸数字マッピング ---
const CIRCLED_NUMBERS = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'

/**
 * タイトル正規化: ベースタイトルを抽出して同名判定
 */
function normalizeTitle(title: string): string {
  let t = title

  // 1. NFKC正規化（全角→半角統一）
  t = t.normalize('NFKC')

  // 2. 丸数字削除
  for (const c of CIRCLED_NUMBERS) {
    t = t.replaceAll(c, '')
  }

  // 3. 末尾日付パターン削除
  // 「2月」「5/10」「2025年2月」「2025/2/10」「2月開催」等
  t = t.replace(/\s*\d{2,4}[年/]\d{1,2}([月/]\d{1,2})?[日]?\s*$/, '')
  t = t.replace(/\s*\d{1,2}[月/]\d{1,2}[日]?\s*$/, '')
  t = t.replace(/\s*\d{1,2}月(開催)?\s*$/, '')

  // 4. 末尾番号削除（#1, Vol.2, 第3回 等）
  t = t.replace(/\s*#\d+\s*$/, '')
  t = t.replace(/\s*Vol\.?\s*\d+\s*$/i, '')
  t = t.replace(/\s*第\d+[回期]?\s*$/, '')
  t = t.replace(/\s*\d+回目?\s*$/, '')

  // 5. 末尾の括弧内容削除（(2月開催) [第2回] 等）
  t = t.replace(/\s*[(\[（【][^)\]）】]*[)\]）】]\s*$/, '')

  // 5b. 先頭ラベル削除（【親子向け】【フィギュア】等）。
  //     「親子向け」は日程フラグ(is_family_friendly)で表現するため、タイトルで別カテゴリに割らない。
  //     これにより「【親子向け】AI×3D…」と「AI×3D…ワークショップ」が同一グループに寄る。
  t = t.replace(/^\s*[(\[（【][^)\]）】]*[)\]）】]\s*/, '')

  // 5c. 末尾の汎用語吸収（「…ワークショップ」等の有無で別カテゴリに割れるのを防ぐ）
  t = t.replace(/\s*ワークショップ\s*$/, '')

  // 6. 末尾空白・記号クリーンアップ
  t = t.replace(/[\s\-_・:：]+$/, '')
  t = t.trim()

  return t
}

/**
 * スラッグ生成: 日本語→英語マッピングで変換
 */
function generateSlug(name: string): string {
  let slug = name

  // NFKC正規化
  slug = slug.normalize('NFKC')

  // 辞書で日本語→英語変換（長い語句を先にマッチさせる）
  const sortedEntries = Object.entries(SLUG_DICT)
    .sort(([a], [b]) => b.length - a.length)
  for (const [ja, en] of sortedEntries) {
    slug = slug.replaceAll(ja, ` ${en} `)
  }

  // 【】「」『』（）等の括弧を除去
  slug = slug.replace(/[【】「」『』（）\[\]()]/g, ' ')

  // 残りの非ASCII文字を除去
  slug = slug.replace(/[^\x20-\x7E]/g, '')

  // 連続スペース・記号をハイフンに
  slug = slug.replace(/[\s\-_.:;,/\\!?×&]+/g, '-')

  // 先頭・末尾のハイフン除去
  slug = slug.replace(/^-+|-+$/g, '')

  // 小文字化
  slug = slug.toLowerCase()

  // 50文字制限
  if (slug.length > 50) {
    slug = slug.substring(0, 50).replace(/-+$/, '')
  }

  return slug || 'workshop'
}

/**
 * slug衝突回避: 既存slugセットに対して一意なslugを返す
 */
function uniqueSlug(base: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(base)) {
    return base
  }
  let i = 2
  while (existingSlugs.has(`${base}-${i}`)) {
    i++
  }
  return `${base}-${i}`
}

interface WorkshopRow {
  id: string
  title: string
  image_url: string | null
  category_id: string | null
  event_date: string | null
}

interface CategoryRow {
  id: string
  slug: string
}

interface Group {
  baseName: string
  workshops: WorkshopRow[]
}

async function main() {
  console.log('=== 同名ワークショップ一括カテゴリ化 ===')
  console.log(`モード: ${applyMode ? '実行 (--apply)' : 'ドライラン（プレビューのみ）'}`)
  console.log(`最小グループサイズ: ${minGroupSize}`)
  console.log('')

  // 1. 全ワークショップ取得
  const { data: workshops, error: wsError } = await supabase
    .from('workshops')
    .select('id, title, image_url, category_id, event_date')
    .order('event_date', { ascending: true })

  if (wsError) {
    console.error('ワークショップ取得エラー:', wsError.message)
    process.exit(1)
  }

  if (!workshops || workshops.length === 0) {
    console.log('ワークショップが見つかりません。')
    process.exit(0)
  }

  console.log(`全ワークショップ数: ${workshops.length}`)

  // 2. category_idが既にあるものをカウント（冪等性）
  const alreadyCategorized = workshops.filter((w: WorkshopRow) => w.category_id != null)
  const uncategorized = workshops.filter((w: WorkshopRow) => w.category_id == null)
  console.log(`カテゴリ割当済: ${alreadyCategorized.length}件`)
  console.log(`未カテゴリ: ${uncategorized.length}件`)
  console.log('')

  if (uncategorized.length === 0) {
    console.log('全ワークショップがカテゴリ割当済みです。')
    process.exit(0)
  }

  // 3. normalizeTitle()でベースタイトル抽出 → グルーピング
  const groupMap = new Map<string, WorkshopRow[]>()
  for (const ws of uncategorized) {
    const base = normalizeTitle(ws.title)
    if (!groupMap.has(base)) {
      groupMap.set(base, [])
    }
    groupMap.get(base)!.push(ws)
  }

  // minGroupSizeでフィルタ
  const groups: Group[] = []
  let skippedSingles = 0
  for (const [baseName, wsList] of groupMap) {
    if (wsList.length >= minGroupSize) {
      groups.push({ baseName, workshops: wsList })
    } else {
      skippedSingles += wsList.length
    }
  }

  // ソート（グループサイズ降順）
  groups.sort((a, b) => b.workshops.length - a.workshops.length)

  console.log(`検出グループ数: ${groups.length}`)
  if (skippedSingles > 0) {
    console.log(`スキップ（グループサイズ < ${minGroupSize}）: ${skippedSingles}件`)
  }
  console.log('')

  // 4. プレビュー表示
  console.log('--- グルーピング結果 ---')
  for (const group of groups) {
    console.log(`\n[${group.baseName}] (${group.workshops.length}件)`)
    console.log(`  slug: ${generateSlug(group.baseName)}`)
    for (const ws of group.workshops) {
      console.log(`  - ${ws.title} (${ws.event_date || '日付なし'}) [${ws.id.substring(0, 8)}...]`)
    }
  }
  console.log('')

  if (!applyMode) {
    console.log('ドライランのため、DB変更は行いません。')
    console.log('実行する場合は --apply オプションを付けてください。')
    process.exit(0)
  }

  // --- ここから実際のDB変更 ---
  console.log('=== DB変更を開始 ===')

  // 既存カテゴリのslugを取得（衝突チェック用）
  const { data: existingCategories, error: catError } = await supabase
    .from('workshop_categories')
    .select('id, slug')

  if (catError) {
    console.error('カテゴリ取得エラー:', catError.message)
    process.exit(1)
  }

  const existingSlugMap = new Map<string, string>() // slug → id
  const usedSlugs = new Set<string>()
  for (const cat of (existingCategories || []) as CategoryRow[]) {
    existingSlugMap.set(cat.slug, cat.id)
    usedSlugs.add(cat.slug)
  }

  let createdCount = 0
  let reusedCount = 0
  let updatedCount = 0

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]
    const slug = uniqueSlug(generateSlug(group.baseName), usedSlugs)

    // 同じslugのカテゴリが既に存在すればスキップ（IDを再利用）
    let categoryId: string

    if (existingSlugMap.has(slug)) {
      categoryId = existingSlugMap.get(slug)!
      console.log(`既存カテゴリを再利用: "${group.baseName}" (slug: ${slug})`)
      reusedCount++
    } else {
      // カテゴリINSERT
      const imageUrl = group.workshops.find(w => w.image_url)?.image_url || null
      const { data: newCat, error: insertError } = await supabase
        .from('workshop_categories')
        .insert({
          name: group.baseName,
          slug,
          description: null,
          image_url: imageUrl,
          sort_order: i + 1,
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`カテゴリ作成エラー "${group.baseName}":`, insertError.message)
        continue
      }

      categoryId = newCat.id
      usedSlugs.add(slug)
      existingSlugMap.set(slug, categoryId)
      console.log(`カテゴリ作成: "${group.baseName}" (slug: ${slug}, id: ${categoryId.substring(0, 8)}...)`)
      createdCount++
    }

    // ワークショップのcategory_id UPDATE
    const wsIds = group.workshops.map(w => w.id)
    const { error: updateError } = await supabase
      .from('workshops')
      .update({ category_id: categoryId })
      .in('id', wsIds)

    if (updateError) {
      console.error(`ワークショップ更新エラー (${group.baseName}):`, updateError.message)
      continue
    }

    updatedCount += wsIds.length
    console.log(`  → ${wsIds.length}件のワークショップにcategory_id割当完了`)
  }

  console.log('')
  console.log('=== 完了 ===')
  console.log(`カテゴリ新規作成: ${createdCount}件`)
  console.log(`カテゴリ再利用: ${reusedCount}件`)
  console.log(`ワークショップ更新: ${updatedCount}件`)
}

main().catch((error) => {
  console.error('エラー:', error)
  process.exit(1)
})
