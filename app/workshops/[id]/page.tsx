import { notFound, redirect } from 'next/navigation'
import { getWorkshop } from '@/lib/workshops'
import WorkshopDetailView from '@/components/WorkshopDetailView'

export const revalidate = 3600

// 公開ワークショップをビルド時に列挙して ISR 化する（これが無いとルート全体が毎リクエスト SSR になる）。
// ビルド後に追加されたワークショップも dynamicParams (デフォルト true) により初回アクセス時に生成される。
// 注意: この ISR ルートでは cookies() 等の Dynamic API を呼んではいけない（DYNAMIC_SERVER_USAGE で 500 になる）。
// 限定公開 (is_private) のパスワードゲートは動的ルート /workshops/preview/[id] に委譲する。
export async function generateStaticParams() {
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase
    .from('workshops')
    .select('id')
    .eq('is_private', false)
  return (data ?? []).map(({ id }) => ({ id }))
}

export default async function WorkshopDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workshop = await getWorkshop(id)

  if (!workshop) {
    notFound()
  }

  // 限定公開はパスワードゲート付きの動的ルートへ（共有済みURLはリダイレクトで生きる）
  if (workshop.is_private) {
    redirect(`/workshops/preview/${id}`)
  }

  return <WorkshopDetailView workshop={workshop} />
}
