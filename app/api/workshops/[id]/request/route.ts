import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, generateWorkshopRequestEmail } from '@/app/lib/email'

const ADMIN_TO = 'y-sato@sunu25.com'
const ADMIN_CC = ['yuho.ito@walker.co.jp', 'nanzinaniwa6@gmail.com']

const lastSubmitByIp = new Map<string, number>()
const RATE_LIMIT_MS = 30_000

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const { id } = await context.params
    const body = await request.json()
    const {
      email,
      name,
      phone,
      participants,
      preferred_dates: preferredDates,
      message,
      website,
    } = body as {
      email?: string
      name?: string
      phone?: string
      participants?: number
      preferred_dates?: string
      message?: string
      website?: string
    }

    if (website) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    if (!email || !emailValid(email)) {
      return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
    }
    if (message && message.length > 2000) {
      return NextResponse.json({ error: 'メッセージは2000文字以内で入力してください' }, { status: 400 })
    }
    if (preferredDates && preferredDates.length > 500) {
      return NextResponse.json({ error: '希望日程は500文字以内で入力してください' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32)
    const now = Date.now()
    const last = lastSubmitByIp.get(ipHash) || 0
    if (now - last < RATE_LIMIT_MS) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    lastSubmitByIp.set(ipHash, now)

    const { data: workshop, error: workshopError } = await supabaseAdmin
      .from('workshops')
      .select('id, title')
      .eq('id', id)
      .single()

    if (workshopError || !workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    const { data: requestRow, error: insertError } = await supabaseAdmin
      .from('workshop_requests')
      .insert({
        workshop_id: id,
        email,
        name: name || null,
        phone: phone || null,
        participants: participants || null,
        preferred_dates: preferredDates || null,
        message: message || null,
        user_agent: request.headers.get('user-agent') || null,
        referrer: request.headers.get('referer') || null,
        ip_hash: ipHash,
      })
      .select()
      .single()

    if (insertError) {
      console.error('workshop_requests insert failed:', insertError)
      return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 })
    }

    try {
      const { subject, html } = generateWorkshopRequestEmail({
        workshopTitle: workshop.title,
        workshopId: workshop.id,
        email,
        name,
        phone,
        participants,
        preferredDates,
        message,
      })
      await sendEmail({ to: ADMIN_TO, cc: ADMIN_CC, subject, html })
    } catch (mailErr) {
      console.error('workshop request email failed:', mailErr)
    }

    return NextResponse.json({ ok: true, request_id: requestRow.id })
  } catch (err) {
    console.error('workshop request handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
