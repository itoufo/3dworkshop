import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Workshop, WorkshopCategory } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getWorkshop = cache(async (id: string): Promise<Workshop | null> => {
  const { data } = await supabase
    .from('workshops')
    .select('*, category:workshop_categories(*)')
    .eq('id', id)
    .single()
  return data as Workshop | null
})

export async function getAllWorkshops(): Promise<Workshop[]> {
  const { data } = await supabase
    .from('workshops')
    .select('*, category:workshop_categories(*)')
    .order('is_pinned', { ascending: false })
    .order('pin_order', { ascending: true })
    .order('event_date', { ascending: true })
    .order('event_time', { ascending: true })
  return (data as Workshop[]) || []
}

export async function getWorkshopCategories(): Promise<WorkshopCategory[]> {
  const { data } = await supabase
    .from('workshop_categories')
    .select('*')
    .order('sort_order', { ascending: true })
  return (data as WorkshopCategory[]) || []
}

export async function getRelatedWorkshops(workshopId: string, categoryId: string): Promise<Workshop[]> {
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('workshops')
    .select('*, category:workshop_categories(*)')
    .eq('category_id', categoryId)
    .neq('id', workshopId)
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .limit(3)
  return (data as Workshop[]) || []
}
