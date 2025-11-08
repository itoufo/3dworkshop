import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "商品・サービス | 3Dプリント制作・ワークショップ | 3DLab",
  description: "3Dプリンタ教室3DLabの商品・サービス一覧。ワークショップ、3Dプリント制作サービス、オリジナル商品など、様々なサービスをご用意しています。STLファイルをアップロードして3Dプリント制作を依頼できます。",
  keywords: "3Dプリント 制作,3Dプリンタ サービス,STLファイル,プロトタイプ制作,3Dプリンティング 依頼,ワークショップ,商品",
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: "商品・サービス | 3Dプリント制作・ワークショップ | 3DLab",
    description: "3Dプリンタ教室3DLabの商品・サービス一覧。ワークショップ、3Dプリント制作サービス、オリジナル商品など、様々なサービスをご用意しています。",
    url: 'https://3dlab.jp/products',
    siteName: "3DLab - 3Dプリンタ教室",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '3DLab 商品・サービス',
      },
    ],
    locale: "ja_JP",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "商品・サービス | 3Dプリント制作・ワークショップ",
    description: "3Dプリンタ教室3DLabの商品・サービス一覧。ワークショップ、3Dプリント制作サービスなど。",
    images: ['/og-image.jpg'],
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
