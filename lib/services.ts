import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Service } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getAllServices(): Promise<Service[]> {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data as Service[]) || []
}

export const getService = cache(async (id: string): Promise<Service | null> => {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .single()
  return data as Service | null
})

export async function getServicesByType(type: Service['type']): Promise<Service[]> {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .eq('type', type)
    .order('sort_order', { ascending: true })
  return (data as Service[]) || []
}
