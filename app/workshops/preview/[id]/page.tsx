import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getWorkshop } from '@/lib/workshops'
import { previewCookieName, previewToken } from '@/lib/preview-auth'
import WorkshopPasswordGate from '@/components/WorkshopPasswordGate'
import WorkshopDetailView from '@/components/WorkshopDetailView'

// 限定公開ワークショップ専用ルート。
// cookies() でパスワード認証を判定するため毎リクエスト動的レンダリング（ISR 不可）。
// 公開ワークショップの ISR 化 (/workshops/[id]) と分離するためにこのルートが存在する。
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const workshop = await getWorkshop(id)
  return {
    title: workshop ? `${workshop.title} | 3DLab` : 'ワークショップ | 3DLab',
    description: '限定公開のワークショップです。',
    robots: { index: false, follow: false },
  }
}

export default async function WorkshopPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workshop = await getWorkshop(id)

  if (!workshop) {
    notFound()
  }

  // 公開ワークショップは正規の ISR ページへ
  if (!workshop.is_private) {
    redirect(`/workshops/${id}`)
  }

  // パスワード認証済み Cookie がなければパスワードゲートを表示
  const cookieStore = await cookies()
  const token = cookieStore.get(previewCookieName(workshop.id))?.value
  const expected = workshop.preview_password
    ? previewToken(workshop.id, workshop.preview_password)
    : null
  if (!expected || token !== expected) {
    return <WorkshopPasswordGate workshopId={workshop.id} title={workshop.title} />
  }

  return <WorkshopDetailView workshop={workshop} />
}
