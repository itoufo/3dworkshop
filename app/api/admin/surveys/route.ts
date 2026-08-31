import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isAdminRequest } from '@/lib/admin-auth'

// 管理画面のアンケートタブ。設問の確認・編集・公開日の割り当て・削除。
//
// ⚠ ガードは isAdminRequest()（httpOnly の署名付き cookie）を使う。
//   admin_auth cookie はブラウザから偽造できるので、書き込める API の鍵にはならない。

export const runtime = 'nodejs'

const EDITABLE_TEXT_FIELDS = [
  'slug',
  'question',
  'description',
  'option_a',
  'option_b',
  'result_comment',
  'related_category_slug',
] as const

const STATUSES = ['draft', 'scheduled', 'live', 'closed']

/** 一覧。draft の在庫が何日分あるかがひと目で分かることを優先する */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const [pending, closed, categories] = await Promise.all([
    // 未公開と受付中。公開日が決まっているものを先に、次にストック
    supabaseAdmin
      .from('surveys')
      .select('*')
      .in('status', ['draft', 'scheduled', 'live'])
      .order('publish_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('surveys')
      .select('*')
      .eq('status', 'closed')
      .order('publish_date', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('workshop_categories')
      .select('slug, name')
      .order('sort_order', { ascending: true }),
  ])

  if (pending.error || closed.error) {
    const message = pending.error?.message || closed.error?.message
    console.error('admin surveys list failed:', message)
    return NextResponse.json({ error: '一覧の取得に失敗しました' }, { status: 500 })
  }

  const rows = pending.data || []
  const stock = rows.filter((r) => r.status === 'draft' && !r.publish_date).length

  return NextResponse.json({
    stock,
    pending: rows,
    closed: closed.data || [],
    categories: categories.data || [],
  })
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const id: unknown = body.id
    if (typeof id !== 'string' || !id) {
      return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
    }

    // 変更の可否は今の状態で決まるので、先に現物を読む
    const { data: current, error: currentError } = await supabaseAdmin
      .from('surveys')
      .select('status')
      .eq('id', id)
      .maybeSingle()

    if (currentError) {
      console.error('admin surveys lookup failed:', currentError.message)
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
    }
    if (!current) {
      return NextResponse.json({ error: '設問が見つかりません' }, { status: 404 })
    }

    // ⚠ 受け取った body をそのまま渡さない。count_a / count_b / finalized_at まで
    //   書き換えられると、集計が survey_answers の行数と食い違う
    const patch: Record<string, unknown> = {}

    for (const field of EDITABLE_TEXT_FIELDS) {
      if (!(field in body)) continue
      const value = body[field]
      if (value === null || value === '') {
        // slug と設問・選択肢は空にできない
        if (['slug', 'question', 'option_a', 'option_b'].includes(field)) {
          return NextResponse.json({ error: `${field} は空にできません` }, { status: 400 })
        }
        patch[field] = null
        continue
      }
      if (typeof value !== 'string' || value.length > 500) {
        return NextResponse.json({ error: `${field} の形式が不正です` }, { status: 400 })
      }
      patch[field] = value
    }

    if ('slug' in patch && !/^[a-z0-9-]{3,60}$/.test(patch.slug as string)) {
      return NextResponse.json(
        { error: 'slug は英小文字・数字・ハイフンのみ（3〜60文字）にしてください' },
        { status: 400 }
      )
    }
    // ⚠ /survey/archive はページのルートなので、slug に使わせない
    if (patch.slug === 'archive') {
      return NextResponse.json({ error: 'slug に archive は使えません' }, { status: 400 })
    }
    // ⚠ 公開済みの slug は変えさせない。DELETE を draft 限定にしているのと同じ理由で、
    //   共有された X / LINE のリンクと、サイトマップで送った URL が全部 404 になる
    if ('slug' in patch && current.status !== 'draft') {
      return NextResponse.json(
        { error: '公開済みの設問の slug は変更できません（共有されたリンクが 404 になります）' },
        { status: 409 }
      )
    }

    if ('publish_date' in body) {
      const value = body.publish_date
      if (value === null || value === '') {
        patch.publish_date = null
      } else if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        patch.publish_date = value
      } else {
        return NextResponse.json({ error: '公開日は YYYY-MM-DD 形式で指定してください' }, { status: 400 })
      }

      // ⚠ 受付中の設問から公開日を外させない。cron は「今日ではない live」を締めるので
      //   締められはするが、締まった瞬間に別の設問が今日ぶんとして立ち、
      //   その日の回答が中途半端に分かれる。外したいならまず締めてもらう
      if (patch.publish_date === null && current.status === 'live') {
        return NextResponse.json(
          { error: '受付中の設問からは公開日を外せません。先に締切にしてください' },
          { status: 409 }
        )
      }
    }

    if ('status' in body) {
      if (typeof body.status !== 'string' || !STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'status の値が不正です' }, { status: 400 })
      }
      patch.status = body.status
      // 締切にするときは確定時刻も打つ（cron を待たずに締める場合のため）
      if (body.status === 'closed') patch.finalized_at = new Date().toISOString()
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: '更新する項目がありません' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('surveys')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      // 23505 = UNIQUE 違反。slug か publish_date のどちらか
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'その公開日か slug は、ほかの設問が既に使っています' },
          { status: 409 }
        )
      }
      console.error('admin surveys patch failed:', error.message)
      return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: '設問が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ success: true, survey: data })
  } catch (error) {
    console.error('admin surveys patch error:', error)
    return NextResponse.json({ error: '更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: '管理者のみ実行できます' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id が必要です' }, { status: 400 })
  }

  // ⚠ 未公開のストックしか消させない。公開済みの設問を消すと、
  //   検索結果や共有されたリンクから来た人が 404 に当たる（回答も道連れに消える）
  const { data, error } = await supabaseAdmin
    .from('surveys')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('admin surveys delete failed:', error.message)
    return NextResponse.json({ error: '削除に失敗しました' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json(
      { error: '未公開（draft）の設問のみ削除できます' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true })
}
