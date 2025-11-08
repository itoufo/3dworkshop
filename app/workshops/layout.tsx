import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ワークショップ一覧 | 3Dプリンタ体験 東京・湯島",
  description: "東京都文京区湯島の3Dプリンタ教室で開催されるワークショップ一覧。初心者向け体験から本格的な3Dモデリングまで、多彩なワークショップをご用意しています。湯島駅徒歩1分、御徒町・秋葉原・御茶ノ水からもアクセス可能。",
  keywords: "3Dプリンタ ワークショップ,3Dプリンティング 体験,湯島,東京,3D教室,体験会,3Dモデリング,初心者,子ども向け",
  alternates: {
    canonical: '/workshops',
  },
  openGraph: {
    title: "ワークショップ一覧 | 3Dプリンタ体験 東京・湯島 | 3DLab",
    description: "東京都文京区湯島の3Dプリンタ教室で開催されるワークショップ一覧。初心者向け体験から本格的な3Dモデリングまで、多彩なワークショップをご用意しています。",
    url: 'https://3dlab.jp/workshops',
    siteName: "3DLab - 3Dプリンタ教室",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '3DLab ワークショップ一覧',
      },
    ],
    locale: "ja_JP",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ワークショップ一覧 | 3Dプリンタ体験 東京・湯島",
    description: "東京都文京区湯島の3Dプリンタ教室で開催されるワークショップ一覧。初心者向け体験から本格的な3Dモデリングまで。",
    images: ['/og-image.jpg'],
  },
};

export default function WorkshopsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

