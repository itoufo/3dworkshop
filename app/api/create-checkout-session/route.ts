import { NextRequest, NextResponse } from 'next/server'
import { stripe, checkoutExpiresAt } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getConsentTextFor } from '@/lib/consent-default'
import { closeBookingIfPastDeadline } from '@/lib/booking-deadline-server'
import { toLocale } from '@/lib/i18n'
import {
  parseParticipantOption,
  resolveParticipantChoices,
  participantChoicesTotal,
  summarizeParticipantChoices,
  type ParticipantOptionChoice,
} from '@/lib/participant-option'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workshop_id, booking_id, customer_email, participants, coupon_id, discount_amount } = body
    // 英語ページ（/en）からの予約は、決済後・キャンセル時も英語ページへ戻す。値は 'ja' | 'en' に丸める
    const localePrefix = toLocale(body.locale) === 'en' ? '/en' : ''

    // リクエストから現在のホストを取得
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const baseUrl = `${protocol}://${host}`

    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not available')
    }

    // ワークショップ情報を取得
    const { data: workshop } = await supabaseAdmin
      .from('workshops')
      .select('*')
      .eq('id', workshop_id)
      .single()

    if (!workshop) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // 予約締切（開始時刻・予約0人の締切）。締切後なら仮予約を取り消して止める。
    // ⚠ booking_id なしで呼ばれると締切を確かめられないので受け付けない
    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }
    const deadline = await closeBookingIfPastDeadline(supabaseAdmin, booking_id)
    if (deadline.closed) {
      return NextResponse.json({ error: deadline.message, code: 'booking_closed' }, { status: 409 })
    }
    // 参加同意書への同意がない予約は決済に進めない。
    // ⚠ 同意の日時と本文はここ（サーバー）で書く。予約行はブラウザが anon キーで作るので、
    //   ブラウザが送った日時・本文は端末の時計や任意の文字列になりうる
    const { data: bookingRow } = await supabaseAdmin
      .from('bookings')
      .select('id, status, workshop_id, stripe_session_id')
      .eq('id', booking_id)
      .single()

    if (!bookingRow || bookingRow.workshop_id !== workshop.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }
    if (body.consent !== true) {
      // デプロイ前に開いたままのタブ（同意欄のない古い画面）から来た場合。仮予約を残すと早割の枠を食うので取り消す
      if (bookingRow.status === 'pending') {
        await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', booking_id)
      }
      return NextResponse.json({ error: 'ページの表示が古いため、参加同意書への同意を確認できませんでした。お手数ですが、ページを再読み込みしてもう一度お申し込みください。' }, { status: 400 })
    }
    // 金額はサーバー側でDBの価格から再計算する（クライアント送信値は信用しない）
    const qty = participants || 1
    const base = workshop.price * qty

    // 参加者ごとの選択肢（例: 塗るフィギュア）。ブラウザが送るのは選んだ id だけで、名前と金額は DB から引く。
    // 人数と数が合わない・知らない id が混じる場合は決済に進めない（選択肢を足す前に開いたままのタブなど）
    const participantOption = parseParticipantOption(workshop.participant_option)
    let participantChoices: ParticipantOptionChoice[] = []
    if (participantOption) {
      // 1つの予約行に決済セッションを作れるのは1回だけ。
      // 2回目を受けると、予約行の控え（選んだものと満額）が後のセッションの内容で上書きされ、
      // 先のセッション（安い選択）を支払った人の記録が「高い選択・支払い済み」になる。
      // 予約フォームは送信のたびに新しい予約行を作るので、正常な操作では1回しか来ない
      if (bookingRow.status !== 'pending' || bookingRow.stripe_session_id) {
        return NextResponse.json({ error: 'この予約はすでに決済の手続きに入っています。お手数ですが、ページを再読み込みしてもう一度お申し込みください。', code: 'choices_invalid' }, { status: 409 })
      }
      const resolved = resolveParticipantChoices(participantOption, body.participant_choice_ids, qty)
      if (!resolved) {
        // 仮予約を残すと席と早割の枠を食うので取り消す
        if (bookingRow.status === 'pending') {
          await supabaseAdmin.from('bookings').update({ status: 'cancelled' }).eq('id', booking_id)
        }
        return NextResponse.json({ error: `「${participantOption.label}」の選択を確認できませんでした。お手数ですが、ページを再読み込みしてもう一度お申し込みください。`, code: 'choices_invalid' }, { status: 400 })
      }
      participantChoices = resolved
    }
    const optionTotal = participantChoicesTotal(participantChoices)
    // 割引前の満額（参加費 ＋ 選んだものの代金）
    const fullAmount = base + optionTotal

    // 同意の記録と一緒に、満額と選択の控えを書く。
    // ⚠ 決済セッションを作る前に書くこと。後に書くと、書き込みに失敗しても客は支払えてしまい、
    //   「何を選んだか」が予約行に残らない（スタッフが用意するものが分からなくなる）
    // ⚠ 予約行はブラウザが作るので、そこにある金額・選択は信用しない。満額は必ずここで書き直す
    //   （選択肢の無いワークショップでは 参加費×人数 で、正常なブラウザが書く値と同じ）
    const { error: recordError } = await supabaseAdmin
      .from('bookings')
      .update({
        consent_agreed_at: new Date().toISOString(),
        consent_text_snapshot: getConsentTextFor(workshop, toLocale(body.locale)),
        total_amount: fullAmount,
        ...(participantOption ? { participant_choices: participantChoices } : {}),
      })
      .eq('id', booking_id)
    if (recordError && participantOption) {
      console.error('Failed to record participant choices:', recordError)
      return NextResponse.json({ error: 'Error creating checkout session' }, { status: 500 })
    }

    // 早割: 先着 early_bird_slots 組（キャンセル以外の予約行数）以内なら「1名あたり割引」を適用。
    // 現在の予約行（作成済みpending）は除外して数える。
    let earlyBirdDiscount = 0
    if (
      workshop.early_bird_enabled &&
      (workshop.early_bird_discount ?? 0) > 0 &&
      (workshop.early_bird_slots ?? 0) > 0
    ) {
      const { count } = await supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('workshop_id', workshop_id)
        .neq('status', 'cancelled')
        .neq('id', booking_id)
      if ((count ?? 0) < workshop.early_bird_slots) {
        earlyBirdDiscount = workshop.early_bird_discount * qty
      }
    }

    // クーポン割引はクライアント値を上限クランプして使用（既存挙動の踏襲）。
    // ⚠ 上限は参加費（base）まで。クーポンと早割は参加費への割引で、選んだもの（フィギュア等）の代金は割り引かない
    const couponDiscount = Math.max(0, Math.min(discount_amount || 0, base))
    const totalDiscount = Math.min(couponDiscount + earlyBirdDiscount, base)
    // 全額割引（100%クーポン等）は ¥0 で通す。¥50 に切り上げると無料のはずの予約に請求が立つ。
    // 1〜49円だけは Stripe の最低決済金額(¥50)に切り上げる
    const remaining = fullAmount - totalDiscount
    const unitAmount = remaining <= 0 ? 0 : Math.max(50, remaining)

    // Stripe Checkout セッションを作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      // 決済画面の表示言語。英語ページからは英語、それ以外は Stripe の自動判定（従来どおり）
      ...(localePrefix ? { locale: 'en' as const } : {}),
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: workshop.title,
              description: `${workshop.description} (${participants}名)${
                participantOption ? ` / ${participantOption.label}: ${summarizeParticipantChoices(participantChoices)}` : ''
              }`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: customer_email,
      // 30分で失効させ、未決済のまま席が押さえられ続けるのを防ぐ。
      // 失効時は checkout.session.expired Webhook で予約をキャンセルする。
      expires_at: checkoutExpiresAt(),
      success_url: `${baseUrl}${localePrefix}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${localePrefix}/workshops/${workshop_id}`,
      metadata: {
        booking_id: booking_id,
        workshop_id: workshop_id,
        coupon_id: coupon_id || '',
        discount_amount: couponDiscount,
        early_bird_discount: earlyBirdDiscount,
        option_total: optionTotal,
      },
    })

    // 予約にStripeセッションIDと割引情報を保存（total_amountは満額のまま、割引はdiscount_amountに集約）
    await supabaseAdmin
      .from('bookings')
      .update({
        stripe_session_id: session.id,
        coupon_id: coupon_id || null,
        // 実際に請求した額と一致させる（¥50 への切り上げ・満額超えの割引を反映）
        discount_amount: fullAmount - unitAmount,
      })
      .eq('id', booking_id)

    // メール送信はWebhookで決済完了後に行うため、ここでは送信しない
    // 決済完了の確認はStripe Webhookで行います

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    )
  }
}