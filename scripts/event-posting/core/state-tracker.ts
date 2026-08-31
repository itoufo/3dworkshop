import { createClient } from '@supabase/supabase-js'
import { PlatformName, PlatformPostRecord, WorkshopData } from './types'

/**
 * 投稿済みかどうかの記録。
 *
 * ⚠ 書き込みのエラーを握りつぶさないこと。ここが静かに失敗すると、
 *   「投稿は成功 → 記録は失敗 → 次回また未投稿と判定 → 同じイベントを再投稿」
 *   が延々と続き、外部の公開イベント一覧に重複が並ぶ。
 *   実際に connpass で起きていた（CHECK 制約に connpass が無く、upsert が
 *   毎回 23514 で弾かれていた。2026-08-31 のレビューで発覚）。
 */

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function isPosted(workshopId: string, platform: PlatformName): Promise<boolean> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('event_platform_posts')
    .select('status')
    .eq('workshop_id', workshopId)
    .eq('platform', platform)
    .single()

  return data?.status === 'posted' || data?.status === 'review'
}

export async function recordSuccess(
  workshopId: string,
  platform: PlatformName,
  platformEventId?: string,
  platformUrl?: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('event_platform_posts').upsert(
    {
      workshop_id: workshopId,
      platform,
      platform_event_id: platformEventId || null,
      platform_url: platformUrl || null,
      status: 'posted',
      posted_at: new Date().toISOString(),
      error_message: null,
    },
    { onConflict: 'workshop_id,platform' },
  )
  if (error) throw new Error(recordErrorMessage('posted', workshopId, platform, error))
}

export async function recordReview(
  workshopId: string,
  platform: PlatformName,
  note?: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('event_platform_posts').upsert(
    {
      workshop_id: workshopId,
      platform,
      status: 'review',
      error_message: note || '審査待ち',
      posted_at: new Date().toISOString(),
    },
    { onConflict: 'workshop_id,platform' },
  )
  if (error) throw new Error(recordErrorMessage('review', workshopId, platform, error))
}

export async function recordFailure(
  workshopId: string,
  platform: PlatformName,
  error: string,
): Promise<void> {
  const supabase = getSupabase()
  const { error: writeError } = await supabase.from('event_platform_posts').upsert(
    {
      workshop_id: workshopId,
      platform,
      status: 'failed',
      error_message: error,
    },
    { onConflict: 'workshop_id,platform' },
  )
  // ⚠ ここだけは投げない。失敗の記録に失敗しても、元の失敗の報告を潰さないため。
  //   ただし黙らせない（次回の再投稿はどのみち走るので、気付ける形にしておく）
  if (writeError) {
    console.error(recordErrorMessage('failed', workshopId, platform, writeError))
  }
}

export async function getUnpostedWorkshops(
  platform: PlatformName,
  workshops: WorkshopData[],
): Promise<WorkshopData[]> {
  const supabase = getSupabase()
  const ids = workshops.map((w) => w.id)

  const { data: posted } = await supabase
    .from('event_platform_posts')
    .select('workshop_id, status')
    .eq('platform', platform)
    .in('workshop_id', ids)
    .in('status', ['posted', 'review'])

  const postedIds = new Set((posted || []).map((p) => p.workshop_id))
  return workshops.filter((w) => !postedIds.has(w.id))
}

export async function getAllPosts(platform?: PlatformName): Promise<PlatformPostRecord[]> {
  const supabase = getSupabase()
  let query = supabase
    .from('event_platform_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as PlatformPostRecord[]
}

/** 記録に失敗したときのメッセージ。何がどこで落ちたかを1行で分かるようにする */
function recordErrorMessage(
  status: string,
  workshopId: string,
  platform: PlatformName,
  error: { code?: string; message?: string },
): string {
  const hint =
    error.code === '23514'
      ? `（CHECK 制約違反。'${platform}' が event_platform_posts.platform の許可リストに無い可能性がある。supabase/migrations を確認）`
      : ''
  return `投稿状態(${status})の記録に失敗しました: workshop=${workshopId} platform=${platform} code=${error.code ?? '?'} ${error.message ?? ''}${hint}`
}
