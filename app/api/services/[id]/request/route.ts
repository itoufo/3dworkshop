import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail, generateServiceRequestEmail } from '@/app/lib/email'

const ADMIN_TO = 'y-sato@sunu25.com'
const ADMIN_CC = ['yuho.ito@walker.co.jp', 'nanzinaniwa6@gmail.com']

// インメモリ簡易レートリミット (30秒)
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
    const { email, name, phone, quantity, message, website } = body as {
      email?: string
      name?: string
      phone?: string
      quantity?: number
      message?: string
      website?: string  // honeypot
    }

    // honeypot
    if (website) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    if (!email || !emailValid(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (message && message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // レートリミット
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const ipHash = createHash('sha256').update(ip).digest('hex').slice(0, 32)
    const now = Date.now()
    const last = lastSubmitByIp.get(ipHash) || 0
    if (now - last < RATE_LIMIT_MS) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    lastSubmitByIp.set(ipHash, now)

    // サービス取得
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('id, type, title')
      .eq('id', id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // DB 保存
    const { data: requestRow, error: insertError } = await supabaseAdmin
      .from('service_requests')
      .insert({
        service_id: id,
        email,
        name: name || null,
        phone: phone || null,
        quantity: quantity || null,
        message: message || null,
        user_agent: request.headers.get('user-agent') || null,
        referrer: request.headers.get('referer') || null,
        ip_hash: ipHash,
      })
      .select()
      .single()

    if (insertError) {
      console.error('service_requests insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to save request' }, { status: 500 })
    }

    // 通知メール (送信失敗してもDBは保存済みなので 200 を返す)
    try {
      const { subject, html } = generateServiceRequestEmail({
        serviceTitle: service.title,
        serviceType: service.type,
        serviceId: service.id,
        email,
        name,
        phone,
        quantity,
        message,
      })
      await sendEmail({ to: ADMIN_TO, cc: ADMIN_CC, subject, html })
    } catch (mailErr) {
      console.error('service request email send failed:', mailErr)
    }

    return NextResponse.json({ ok: true, request_id: requestRow.id })
  } catch (err) {
    console.error('service request handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
