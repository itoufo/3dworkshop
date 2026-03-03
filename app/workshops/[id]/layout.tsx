import { getWorkshop } from '@/lib/workshops'
import type { Metadata } from 'next'

export const revalidate = 3600

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  try {
    const { id } = await params
    const workshop = await getWorkshop(id)

    if (!workshop) {
      return {
        title: "ワークショップ | 3DLab",
        description: "3Dプリンタ教室3DLabのワークショップ",
      }
    }

    const title = `${workshop.title} | 3Dプリンタワークショップ 東京・湯島 | 3DLab`
    const description = workshop.description || `${workshop.title}のワークショップ。東京都文京区湯島の3Dプリンタ教室3DLabで開催。湯島駅徒歩1分。`
    const imageUrl = workshop.image_url || '/og-image.jpg'

    return {
      title,
      description,
      keywords: `3Dプリンタ ワークショップ,${workshop.title},湯島,東京,3D教室,体験,3Dモデリング`,
      alternates: {
        canonical: `/workshops/${id}`,
      },
      openGraph: {
        title,
        description,
        url: `https://3dlab.jp/workshops/${id}`,
        siteName: "3DLab - 3Dプリンタ教室",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: workshop.title,
          },
        ],
        locale: "ja_JP",
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: "ワークショップ | 3DLab",
      description: "3Dプリンタ教室3DLabのワークショップ",
    }
  }
}

export default function WorkshopDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
