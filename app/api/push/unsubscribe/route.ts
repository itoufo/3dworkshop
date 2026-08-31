import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 購読解除。endpoint を知っているのはその端末だけなので、これを鍵として扱う。

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const { endpoint } = await request.json()
    if (typeof endpoint !== 'string' || !endpoint) {
      return NextResponse.json({ error: 'endpoint が必要です' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) {
      console.error('push unsubscribe failed:', error)
      return NextResponse.json({ error: '解除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('push unsubscribe error:', error)
    return NextResponse.json({ error: '解除に失敗しました' }, { status: 500 })
  }
}
