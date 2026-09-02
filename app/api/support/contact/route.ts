import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientIp, tooManyRequests } from '@/lib/rate-limit'
import { CONTACT } from '@/lib/chat-knowledge'
import {
  sendEmail,
  generateSupportTicketEmail,
  generateSupportAutoReplyEmail,
  type SupportTranscriptLine,
} from '@/app/lib/email'

/**
 * チャットで解決しなかったときの、メールサポートへの引き継ぎ。
 *
 * ⚠ ここは誰でも叩けるうえ、外へメールを出す口。素通しにしない：
 *   - 接続元ごとの回数制限（数えるのは DB。lib/rate-limit.ts）
 *   - 各項目の長さに上限（長文を投げつけられない）
 *   - 送り先は固定。リクエストの値を宛先に使わない（踏み台にされる）
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WINDOW_MS = 60 * 60 * 1000
const MAX_TICKETS = 5

const MAX_NAME = 100
const MAX_MESSAGE = 4000
const MAX_TRANSCRIPT_LINES = 40
const MAX_TRANSCRIPT_CHARS = 2000

/** 送り先は固定。リクエストから宛先を受け取らない */
const STAFF_RECIPIENTS = ['3dlab@sunu25.com', 'yuho.ito@walker.co.jp']

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** クライアントから来たやりとりを、保存してよい形に削る */
function parseTranscript(input: unknown): SupportTranscriptLine[] | null {
  if (!Array.isArray(input)) return null
  const lines: SupportTranscriptLine[] = []
  for (const raw of input.slice(-MAX_TRANSCRIPT_LINES)) {
    if (!raw || typeof raw !== 'object') continue
    const role = (raw as { role?: unknown }).role
    const content = (raw as { content?: unknown }).content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') continue
    lines.push({ role, content: content.slice(0, MAX_TRANSCRIPT_CHARS) })
  }
  return lines.length > 0 ? lines : null
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // ⚠ 接続元は名乗られた値ではなく CDN が付けたヘッダから取る（lib/rate-limit.ts）
  const ip = clientIp(request.headers)
  if (await tooManyRequests(`support:${ip}`, { windowMs: WINDOW_MS, max: MAX_TICKETS })) {
    return NextResponse.json(
      { error: '送信の回数が多すぎます。しばらく待ってからお試しください。お急ぎの場合はお電話ください。' },
      { status: 429 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : ''
  const email = typeof body.email === 'string' ? body.email.trim().slice(0, 200) : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : ''
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE) : ''
  const pagePath = typeof body.pagePath === 'string' ? body.pagePath.slice(0, 300) : null
  // やりとりの共有は本人が選んだときだけ
  const transcript = body.shareTranscript === true ? parseTranscript(body.transcript) : null

  if (!name) return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
  if (!emailValid(email)) {
    return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
  }
  if (message.length < 5) {
    return NextResponse.json({ error: 'お問い合わせ内容を入力してください' }, { status: 400 })
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      name,
      email,
      phone: phone || null,
      message,
      transcript,
      page_path: pagePath,
      source: 'chat',
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !ticket) {
    console.error('support_tickets insert failed:', error)
    return NextResponse.json({ error: '送信に失敗しました。お手数ですがお電話ください。' }, { status: 500 })
  }

  // 担当者への通知。ここが本体なので、失敗したら利用者にもそう伝える
  const staffMail = generateSupportTicketEmail({
    ticketId: ticket.id,
    name,
    email,
    phone: phone || null,
    message,
    transcript,
    pagePath,
  })
  const staffResult = await sendEmail({
    to: STAFF_RECIPIENTS.join(', '),
    subject: staffMail.subject,
    html: staffMail.html,
  })

  if (!staffResult.success) {
    console.error('support ticket staff email failed:', staffResult.error)
    return NextResponse.json(
      {
        error: `受付はしましたが、通知メールの送信に失敗しました。お手数ですが ${CONTACT} までご連絡ください。`,
        ticketId: ticket.id,
      },
      { status: 502 }
    )
  }

  // お客様への控え。届かなくても受付自体は成立しているので、失敗しても成功として返す
  try {
    const replyMail = generateSupportAutoReplyEmail({
      ticketId: ticket.id,
      name,
      message,
      contact: CONTACT,
    })
    const replyResult = await sendEmail({ to: email, subject: replyMail.subject, html: replyMail.html })
    if (!replyResult.success) {
      console.error('support ticket auto reply failed:', replyResult.error)
    }
  } catch (err) {
    console.error('support ticket auto reply error:', err)
  }

  return NextResponse.json({ ok: true, ticketId: ticket.id })
}
