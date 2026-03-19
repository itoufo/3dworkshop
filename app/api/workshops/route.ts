import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
}

export async function GET(request: NextRequest) {
  try {
    const categoryId = request.nextUrl.searchParams.get('category_id')

    let query = supabase
      .from('workshops')
      .select('*, category:workshop_categories(*)')
      .order('is_pinned', { ascending: false })
      .order('pin_order', { ascending: true })
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }

    return NextResponse.json({ data: data || [], count: (data || []).length }, { headers })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
