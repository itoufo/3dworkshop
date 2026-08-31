import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

// 毎日1問の2択アンケートの読み取り側。
// 匿名キーで読む（RLS が status IN ('live','closed') に絞っているので draft は出てこない）。
// 型を lib 側に置くのは lib/blog.ts の BlogPost と同じ流儀。

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type SurveyStatus = 'draft' | 'scheduled' | 'live' | 'closed'

export interface Survey {
  id: string
  slug: string
  question: string
  description: string | null
  option_a: string
  option_b: string
  result_comment: string | null
  publish_date: string | null
  status: SurveyStatus
  count_a: number
  count_b: number
  finalized_at: string | null
  related_workshop_id: string | null
  related_category_slug: string | null
  created_at: string
  updated_at: string
}

/** 一覧・カードで使う分だけ。本文の全列は要らない */
const LIST_COLUMNS =
  'id, slug, question, description, option_a, option_b, result_comment, publish_date, status, count_a, count_b, finalized_at, related_workshop_id, related_category_slug, created_at, updated_at'

/**
 * 日本時間での「今日」を YYYY-MM-DD で返す。
 *
 * ⚠ new Date().toISOString().slice(0,10) を使わないこと。Netlify の関数は UTC で動くので、
 *   日本時間の朝9時より前は前日の日付になる。1日1問の割り当てがずれる。
 */
export function jstDateString(base: Date = new Date()): string {
  const jst = new Date(base.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

/** 受付中の設問（1問だけ存在する想定） */
export const getLiveSurvey = cache(async (): Promise<Survey | null> => {
  const { data } = await supabase
    .from('surveys')
    .select(LIST_COLUMNS)
    .eq('status', 'live')
    .order('publish_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Survey) || null
})

/** 直近の締切済み設問＝「昨日の結果」 */
export const getLatestClosedSurvey = cache(async (): Promise<Survey | null> => {
  const { data } = await supabase
    .from('surveys')
    .select(LIST_COLUMNS)
    .eq('status', 'closed')
    .order('publish_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Survey) || null
})

export const getSurveyBySlug = cache(async (slug: string): Promise<Survey | null> => {
  const { data } = await supabase
    .from('surveys')
    .select(LIST_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  return (data as Survey) || null
})

/** 過去問一覧。締切済みのものだけを新しい順に */
export async function getClosedSurveys(limit = 30, offset = 0): Promise<Survey[]> {
  const { data } = await supabase
    .from('surveys')
    .select(LIST_COLUMNS)
    .eq('status', 'closed')
    .order('publish_date', { ascending: false })
    .range(offset, offset + limit - 1)
  return (data as Survey[]) || []
}

export async function countClosedSurveys(): Promise<number> {
  const { count } = await supabase
    .from('surveys')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'closed')
  return count || 0
}

/** sitemap 用。締切済みの slug と更新日だけ */
export async function getAllPublishedSurveySlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  const { data } = await supabase
    .from('surveys')
    .select('slug, updated_at')
    .in('status', ['live', 'closed'])
    .order('publish_date', { ascending: false })
  return data || []
}

// ---- 表示用のちいさな計算 ----

export function totalVotes(survey: Pick<Survey, 'count_a' | 'count_b'>): number {
  return survey.count_a + survey.count_b
}

/**
 * A / B の割合（整数％、合計100）。
 *
 * ⚠ 両方を個別に四捨五入しない。49.5 / 50.5 が 50 / 51 になって合計101％になり、
 *   円グラフの角度と数字が食い違う。片方を丸めて、もう片方は残りにする。
 */
export function votePercentages(survey: Pick<Survey, 'count_a' | 'count_b'>): {
  a: number
  b: number
} {
  const total = totalVotes(survey)
  if (total === 0) return { a: 0, b: 0 }
  const a = Math.round((survey.count_a / total) * 100)
  return { a, b: 100 - a }
}

/** 「2026年9月1日」表記。設問の公開日はこの形で出す */
export function formatSurveyDate(publishDate: string | null): string {
  if (!publishDate) return ''
  const [y, m, d] = publishDate.split('-')
  return `${Number(y)}年${Number(m)}月${Number(d)}日`
}
