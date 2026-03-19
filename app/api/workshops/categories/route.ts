import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('workshop_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }

    return NextResponse.json({ data: data || [], count: (data || []).length }, { headers })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
