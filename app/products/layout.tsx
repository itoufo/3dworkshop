import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "3Dプリント制作・オーダーメイド | 3DLab",
  description: "3Dプリンタ教室3DLabの3Dプリント制作サービス。STLファイルをアップロードして高品質な3Dプリント制作を依頼できます。オリジナル商品のオーダーメイドも承ります。",
  keywords: "3Dプリント 制作,3Dプリンタ サービス,STLファイル,プロトタイプ制作,3Dプリンティング 依頼,オーダーメイド",
  alternates: {
    canonical: '/products',
  },
  openGraph: {
    title: "3Dプリント制作・オーダーメイド | 3DLab",
    description: "3Dプリンタ教室3DLabの3Dプリント制作サービス。STLファイルをアップロードして高品質な3Dプリント制作を依頼できます。",
    url: 'https://3dlab.jp/products',
    siteName: "3DLab - 3Dプリンタ教室",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '3DLab 3Dプリント制作',
      },
    ],
    locale: "ja_JP",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "3Dプリント制作・オーダーメイド | 3DLab",
    description: "3Dプリンタ教室3DLabの3Dプリント制作サービス。STLファイルから高品質な3Dプリント制作を依頼できます。",
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
