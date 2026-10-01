import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getWorkshop } from '@/lib/workshops'
import EnglishWorkshopDetailView from '@/components/en/EnglishWorkshopDetailView'

export const revalidate = 3600

// 英語ページに載せるワークショップだけを ISR で生成する。それ以外の id は日本語ページへ送る
export async function generateStaticParams() {
  const { supabase } = await import('@/lib/supabase')
  const { data } = await supabase
    .from('workshops')
    .select('id')
    .eq('is_private', false)
    .eq('show_on_english_site', true)
  return (data ?? []).map(({ id }) => ({ id }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const workshop = await getWorkshop(id)
  if (!workshop || workshop.is_private || !workshop.show_on_english_site) {
    return { title: { absolute: 'Workshop | 3DLab Tokyo' } }
  }
  const title = `${workshop.title} | 3DLab Tokyo`
  const description =
    workshop.description || `${workshop.title} — an AI × 3D printer workshop at 3DLab in Yushima, Tokyo.`
  const image = workshop.image_url || '/og-image.jpg'
  return {
    title: { absolute: title },
    description,
    alternates: {
      canonical: `/en/workshops/${id}`,
      languages: { ja: `/workshops/${id}`, en: `/en/workshops/${id}`, 'x-default': `/workshops/${id}` },
    },
    openGraph: { title, description, url: `https://3dlab.jp/en/workshops/${id}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function EnglishWorkshopDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const workshop = await getWorkshop(id)
  if (!workshop) notFound()
  // 英語ページに載せていない・限定公開のワークショップは日本語ページへ
  if (workshop.is_private || !workshop.show_on_english_site) redirect(`/workshops/${id}`)
  return <EnglishWorkshopDetailView workshop={workshop} />
}
