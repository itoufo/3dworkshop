import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Workshop, WorkshopCategory, WorkshopSession } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const SELECT_WITH_RELATIONS =
  '*, category:workshop_categories(*), sessions:workshop_sessions(*)'

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

export async function getAllWorkshops(): Promise<Workshop[]> {
  const { data } = await supabase
    .from('workshops')
    .select(SELECT_WITH_RELATIONS)
    .eq('is_service', false)
    .order('is_pinned', { ascending: false })
    .order('pin_order', { ascending: true })
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
  return ((data as Workshop[]) || []).map(normalizeSessions)
}

export async function getWorkshopCategories(): Promise<WorkshopCategory[]> {
  const { data } = await supabase
    .from('workshop_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data as WorkshopCategory[]) || []
}

export async function getRelatedWorkshops(workshopId: string, categoryId: string): Promise<Workshop[]> {
  // sessions JOIN ベースで取得し、JS側で「upcoming session を1件以上持つ」をフィルタ
  const { data } = await supabase
    .from('workshops')
    .select(SELECT_WITH_RELATIONS)
    .eq('category_id', categoryId)
    .eq('is_service', false)
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
