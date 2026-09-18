import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Workshop, WorkshopCategory, WorkshopSession } from '@/types'
import { isInternalEmail } from '@/lib/internal-emails'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const SELECT_WITH_RELATIONS =
  '*, category:workshop_categories(*), sessions:workshop_sessions(*)'

// 一覧用の軽量 select。rich_description（1件あたり数KB〜十数KB）等の重いフィールドを
// 除外する。全件分が WorkshopListClient への props として RSC ペイロード = HTML に
// 直接埋まるため、ここの絞り込みがそのままページサイズに効く。
const SELECT_FOR_LISTING =
  'id, title, description, image_url, event_date, event_time, duration, location, ' +
  'max_participants, price, is_pinned, pin_order, category_id, ' +
  'category:workshop_categories(id, name, slug), ' +
  'sessions:workshop_sessions(id, event_date, event_time, status, is_family_friendly)'

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function normalizeSessions(w: Workshop): Workshop {
  const sessions = w.sessions ?? []
  // scheduled かつ event_date 昇順でソート
  const sorted = [...sessions]
    .filter(s => s.status === 'scheduled')
    .sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
      return (a.event_time || '').localeCompare(b.event_time || '')
    })
  return { ...w, sessions: sorted }
}

export const getWorkshop = cache(async (id: string): Promise<Workshop | null> => {
  const { data } = await supabase
    .from('workshops')
    .select(SELECT_WITH_RELATIONS)
    .eq('id', id)
    .single()
  if (!data) return null
  return normalizeSessions(data as Workshop)
})

// 一覧表示用（/workshops）。本文が必要な場合は getWorkshop を使うこと。
//
// cache() で包んでいるのは、トップページが同一レンダー内で2回呼ぶため
// （SpecialWorkshopBanner → getFeaturedWorkshop → ここ、と WorkshopActivitySection）。
// 包まないと Supabase に2往復する。
//
// 副作用が1つある: 呼び出し側が同じ配列インスタンスを共有するので、
// その場で .sort() すると他の呼び出し側が見るデータまで並び替わる。
// 並べ替えるときは必ず [...workshops].sort(...) とコピーすること。
export const getAllWorkshops = cache(async (): Promise<Workshop[]> => {
  const { data } = await supabase
    .from('workshops')
    .select(SELECT_FOR_LISTING)
    .eq('is_service', false)
    .eq('is_private', false)
    .order('is_pinned', { ascending: false })
    .order('pin_order', { ascending: true })
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
  // supabase-js は列挙型 select 文字列の型推論に失敗するため unknown 経由でキャスト
  return ((data as unknown as Workshop[]) || []).map(normalizeSessions)
})

// 「特別ワークショップ」バナー用。ピン留め(is_pinned)されていて、かつ今後の開催
// (upcoming session)がある公開ワークショップの先頭を返す。無ければ null。
// ※ 管理画面のピン留めトグルがそのままバナー掲載の ON/OFF を兼ねる。
export async function getFeaturedWorkshop(): Promise<Workshop | null> {
  const all = await getAllWorkshops()
  return all.find(w => w.is_pinned && hasUpcomingSession(w)) ?? null
}

export async function getWorkshopCategories(): Promise<WorkshopCategory[]> {
  const { data } = await supabase
    .from('workshop_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data as WorkshopCategory[]) || []
}

/** トップページの開催実績表示用の集計値 */
export interface WorkshopActivityStats {
  /** 実際に参加者がいた開催日の数 */
  heldDays: number
  /** 延べ参加者数（参加者＋付き添い） */
  participants: number
  /** 初回開催日 (YYYY-MM-DD)。実績が無ければ null */
  firstHeldDate: string | null
}

// 過去の確定予約から「実際に人が来た開催日数」「延べ参加者数」「初回開催日」を出す。
//
// workshop_sessions の過去レコードを数えてはいけない。予約が入らず開催されなかった
// 日程を含むため（2026-09-18 時点で過去71日程のうち、参加者がいたのは41日程）。
// bookings.booking_date は開催日（session と紐づく全115件で session.event_date と一致を確認済み）。
//
// 内部・テスト予約の除外は isInternalEmail() に一本化する。除外リストを SQL 側に複製しない。
//
// 取得行数は現在114行。PostgREST の行数上限に届くようになったら、
// 集計を RPC (SECURITY DEFINER) に移すこと。
export const getWorkshopActivityStats = cache(async (): Promise<WorkshopActivityStats> => {
  const { data } = await supabase
    .from('bookings')
    .select('booking_date, participants, companion_count, customer:customers(email)')
    .eq('status', 'confirmed')
    .lt('booking_date', todayIso())

  type BookingRow = {
    booking_date: string
    participants: number | null
    companion_count: number | null
    customer: { email: string | null } | { email: string | null }[] | null
  }

  const rows = (data as unknown as BookingRow[]) || []
  const heldDates = new Set<string>()
  let participants = 0
  let firstHeldDate: string | null = null

  for (const row of rows) {
    // PostgREST は多対一でもリレーション名によっては配列で返すことがあるため両方を見る
    const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer
    if (isInternalEmail(customer?.email)) continue

    heldDates.add(row.booking_date)
    participants += (row.participants ?? 0) + (row.companion_count ?? 0)
    if (!firstHeldDate || row.booking_date < firstHeldDate) firstHeldDate = row.booking_date
  }

  return { heldDays: heldDates.size, participants, firstHeldDate }
})

export async function getRelatedWorkshops(workshopId: string, categoryId: string): Promise<Workshop[]> {
  // sessions JOIN ベースで取得し、JS側で「upcoming session を1件以上持つ」をフィルタ
  const { data } = await supabase
    .from('workshops')
    .select(SELECT_WITH_RELATIONS)
    .eq('category_id', categoryId)
    .eq('is_service', false)
    .eq('is_private', false)
    .neq('id', workshopId)
  const today = todayIso()
  const list = ((data as Workshop[]) || []).map(normalizeSessions)
  const upcoming = list.filter(w => (w.sessions ?? []).some(s => s.event_date >= today))
  // 最も近い session 日付で昇順ソート、3件
  return upcoming
    .sort((a, b) => {
      const da = getNearestUpcomingSession(a)?.event_date || '9999-12-31'
      const db = getNearestUpcomingSession(b)?.event_date || '9999-12-31'
      return da.localeCompare(db)
    })
    .slice(0, 3)
}

// ============ Session ヘルパー ============

export function getUpcomingSessions(workshop: Workshop, todayDate?: string): WorkshopSession[] {
  const today = todayDate || todayIso()
  return (workshop.sessions ?? []).filter(
    s => s.status === 'scheduled' && s.event_date >= today
  )
}

export function getNearestUpcomingSession(
  workshop: Workshop,
  todayDate?: string
): WorkshopSession | null {
  const upcoming = getUpcomingSessions(workshop, todayDate)
  return upcoming.length > 0 ? upcoming[0] : null
}

export function hasUpcomingSession(workshop: Workshop, todayDate?: string): boolean {
  return getUpcomingSessions(workshop, todayDate).length > 0
}

export function isOpenForRequest(workshop: Workshop): boolean {
  // upcoming session が無ければリクエスト受付対象
  // (sessions=0 でも、過去 session のみでも、両方とも該当)
  return !hasUpcomingSession(workshop)
}

export function getLatestPastSession(workshop: Workshop, todayDate?: string): WorkshopSession | null {
  const today = todayDate || todayIso()
  const past = (workshop.sessions ?? [])
    .filter(s => s.event_date < today)
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
  return past[0] ?? null
}
