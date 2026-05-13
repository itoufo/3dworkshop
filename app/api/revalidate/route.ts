import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

const DEFAULT_PATHS = [
  '/',
  '/workshops',
  '/workshops/categories',
  '/products',
]

export async function POST(request: NextRequest) {
  // admin_auth cookie で保護 (/admin と同じガード)
  const cookieStore = await cookies()
  const auth = cookieStore.get('admin_auth')
  if (!auth || auth.value !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const paths: string[] = Array.isArray(body.paths) && body.paths.length > 0
      ? body.paths
      : DEFAULT_PATHS

    const results = paths.map((p) => {
      try {
        revalidatePath(p)
        return { path: p, ok: true }
      } catch (e) {
        return { path: p, ok: false, error: String(e) }
      }
    })

    // 動的ルートも layout レベルで revalidate
    revalidatePath('/workshops/[id]', 'page')
    revalidatePath('/workshops/category/[slug]', 'page')
    revalidatePath('/services/[id]', 'page')

    return NextResponse.json({ revalidated: true, results, at: new Date().toISOString() })
  } catch (err) {
    console.error('revalidate error:', err)
    return NextResponse.json({ error: 'Failed to revalidate' }, { status: 500 })
  }
}
