import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ブログ | 3Dプリンタ情報・ワークショップレポート | 3DLab",
  description: "3Dプリンタの技術情報、ワークショップレポート、制作のコツ、3Dモデリングの基礎知識など、3Dプリンティングに関する最新情報をお届けします。3DLabからのお知らせもこちらから。",
  keywords: "3Dプリンタ ブログ,3Dプリンティング 情報,ワークショップ レポート,3Dモデリング,技術情報,制作のコツ,3Dプリンタ 初心者",
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: "ブログ | 3Dプリンタ情報・ワークショップレポート | 3DLab",
    description: "3Dプリンタの技術情報、ワークショップレポート、制作のコツなど、3Dプリンティングに関する最新情報をお届けします。",
    url: 'https://3dlab.jp/blog',
    siteName: "3DLab - 3Dプリンタ教室",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '3DLab ブログ',
      },
    ],
    locale: "ja_JP",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ブログ | 3Dプリンタ情報・ワークショップレポート",
    description: "3Dプリンタの技術情報、ワークショップレポート、制作のコツなど、3Dプリンティングに関する最新情報をお届けします。",
    images: ['/og-image.jpg'],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

