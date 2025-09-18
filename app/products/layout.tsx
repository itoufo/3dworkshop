import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '3Dプリント制作サービス | 3DLab 東京',
  description: '東京都文京区湯島の3Dプリント制作サービス。STLファイルから高品質な3Dプリントを制作。PLA・PETG・ABSなど多様な素材に対応。試作品・パーツ・オリジナルグッズ制作。',
  keywords: '3Dプリント サービス,3D印刷 東京,STL,制作依頼,試作品,文京区',
  openGraph: {
    title: '3Dプリント制作サービス | 3DLab 東京',
    description: 'STLファイルから高品質な3Dプリントを制作。多様な素材に対応。',
  },
}

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}