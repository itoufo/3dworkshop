import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '3Dプリンタースクール | 3DLab 東京・湯島',
  description: '東京都文京区湯島の3Dプリンタースクール。基本実践クラスと自由創作クラスで本格的な3D技術を習得。月謝制で通いやすい料金設定。湯島・御徒町・秋葉原から通学可能。',
  keywords: '3Dプリンタースクール,3D教室 東京,月謝制,習い事,文京区,湯島',
  openGraph: {
    title: '3Dプリンタースクール | 3DLab 東京・湯島',
    description: '月謝制の3Dプリンタースクール。基本から応用まで学べる2つのコース。',
  },
}

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}