import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/admin-auth'

// 管理画面からの顧客の手動登録。
//
// 電話・対面で申し込みを受けたお客様など、サイトの申込フォームを通っていない人を
// 管理者が直接 customers に入れるための口。
//
// ⚠ 書き込みは anon キーではなくこのルート（service role）経由にする。
//   管理画面は公開の anon キーで動いており、customers は RLS も切っているので、
//   ブラウザから直接 INSERT する形にすると誰でも顧客を作れてしまう。
//   ガードは isAdminRequest()（httpOnly の署名付き cookie）。admin_auth cookie は偽造できる。

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const
type Gender = (typeof GENDERS)[number]

/** customers.phone の列幅（supabase/schema.sql の VARCHAR(20)） */
const PHONE_MAX_LENGTH = 20

function emailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * ilike に渡す前に LIKE のメタ文字を無効化する。
 * エスケープしないと `_` が任意の1文字にマッチし、taro_yamada@… の登録が
 * 別人の taro.yamada@… に当たって「登録済み」と誤って拒否される。
 *
 * ⚠ これでも完全ではない。PostgREST は値中の `*` を無条件に `%` へ置き換え、
 *   `\*` と書いても `\%` になるだけで `*` そのものは逃がせない。
 *   なので ilike の結果は「候補」として扱い、呼び出し側で厳密に比べ直す。
 */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    // null や配列も JSON としては通るので、オブジェクトであることを確かめてから触る
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
    }
    body = parsed as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  const name = optionalText(body.name, 100)
  // ログイン（/api/account/login）はメールを小文字で照合するので、ここでも小文字に揃える
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 200) : ''
  const address = optionalText(body.address, 500)

  if (!name) return NextResponse.json({ error: 'お名前を入力してください' }, { status: 400 })
  if (!emailValid(email)) {
    return NextResponse.json({ error: 'メールアドレスを正しく入力してください' }, { status: 400 })
  }

  // customers.phone は VARCHAR(20)。超えると INSERT が落ちて汎用 500 になるので、
  // 黙って切り詰めずに、どの欄が原因かを管理者に返す
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (phoneRaw.length > PHONE_MAX_LENGTH) {
    return NextResponse.json(
      { error: `電話番号は${PHONE_MAX_LENGTH}文字以内で入力してください` },
      { status: 400 },
    )
  }
  const phone = phoneRaw || null

  // age は公開の予約フォームと同じ 1〜150 で弾く（DB の CHECK は 0〜150 だが、
  // 0 を入れると顧客一覧の `customer.age && …` が「0」を描画してしまう）。空欄は未登録
  let age: number | null = null
  if (body.age !== undefined && body.age !== null && body.age !== '') {
    const n = Number(body.age)
    if (!Number.isInteger(n) || n < 1 || n > 150) {
      return NextResponse.json({ error: '年齢は 1〜150 の整数で入力してください' }, { status: 400 })
    }
    age = n
  }

  let gender: Gender | null = null
  if (body.gender !== undefined && body.gender !== null && body.gender !== '') {
    if (typeof body.gender !== 'string' || !(GENDERS as readonly string[]).includes(body.gender)) {
      return NextResponse.json({ error: '性別の値が不正です' }, { status: 400 })
    }
    gender = body.gender as Gender
  }

  // 同じメールがすでにあれば上書きせず知らせる。
  // 決済履歴が紐づく行を、手入力で黙って書き換えないため。
  // 大文字小文字違いで過去に入った行（checkout は小文字化していない）も拾う。
  // ilike は候補を広めに取るだけで、本当に同じメールかは小文字化して比べ直す
  // （limit(1) にすると、ワイルドカードで拾った無関係な行が先頭に来て本物を取りこぼす）
  const { data: candidates, error: lookupError } = await supabaseAdmin
    .from('customers')
    .select('id, name, email')
    .ilike('email', escapeLikePattern(email))

  if (lookupError) {
    console.error('admin customer lookup failed:', lookupError)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }
  const existing = (candidates || []).find((c) => c.email.toLowerCase() === email) ?? null
  if (existing) {
    return NextResponse.json(
      {
        error: `このメールアドレスは「${existing.name}」としてすでに登録されています`,
        customer: existing,
      },
      { status: 409 },
    )
  }

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert({ name, email, phone, age, gender, address })
    // password_hash などのログイン情報は返さない
    .select('id, name, email, phone, age, gender, address, created_at')
    .single()

  if (error || !customer) {
    // ilike の確認と insert の間に同じメールで登録された場合は UNIQUE 制約で落ちる
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'このメールアドレスはすでに登録されています' }, { status: 409 })
    }
    console.error('admin customer insert failed:', error)
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ customer }, { status: 201 })
}
