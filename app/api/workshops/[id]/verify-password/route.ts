import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { previewCookieName, previewToken } from '@/lib/preview-auth'

// 限定公開ワークショップのパスワード認証
// 合致した場合、httpOnly Cookie にプレビュートークンを保存する

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const password = typeof body.password === 'string' ? body.password.trim() : ''

    if (!password) {
      return NextResponse.json({ error: 'パスワードを入力してください' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('workshops')
      .select('id, is_private, preview_password')
      .eq('id', id)
      .single()

    if (error || !data || !data.is_private || !data.preview_password) {
      return NextResponse.json({ error: 'Workshop not found' }, { status: 404 })
    }

    // タイミング攻撃対策として sha256 ハッシュ同士を timingSafeEqual で比較
    const submitted = Buffer.from(previewToken(id, password))
    const expected = Buffer.from(previewToken(id, data.preview_password))
    const matched = submitted.length === expected.length && timingSafeEqual(submitted, expected)

    if (!matched) {
      // ブルートフォース抑止のため失敗時は少し待たせる
      await new Promise((resolve) => setTimeout(resolve, 500))
      return NextResponse.json({ error: 'パスワードが違います' }, { status: 401 })
    }

    const response = NextResponse.json({ ok: true })
    response.cookies.set(previewCookieName(id), previewToken(id, password), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    })
    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
