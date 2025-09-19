import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "3Dプリンタ教室 東京 | 3DLab 湯島・御徒町・秋葉原",
  description: "東京都文京区湯島の3Dプリンタ教室。御徒町・秋葉原・御茶ノ水から徒歩圏内。初心者向けワークショップから本格的な3Dプリンティング技術まで学べます。3Dプリンタ 東京で体験型の学習を。",
  keywords: "3Dプリンタ 東京,3Dプリンティング 教室,湯島,御徒町,秋葉原,御茶ノ水,文京区,ワークショップ,3D教室,体験",
  metadataBase: new URL('https://3dlab.jp'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "3Dプリンタ教室 東京 | 3DLab 湯島・御徒町・秋葉原",
    description: "東京都文京区湯島の3Dプリンタ教室。御徒町・秋葉原・御茶ノ水から徒歩圏内。初心者歓迎の体験型ワークショップ。",
    url: 'https://3dlab.jp',
    siteName: "3DLab",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '3DLab - 東京の3Dプリンタ教室',
      },
    ],
    locale: "ja_JP",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "3Dプリンタ教室 東京 | 3DLab",
    description: "東京都文京区湯島の3Dプリンタ教室。初心者歓迎のワークショップ開催中。",
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: "/favicon.ico",
  },
  verification: {
    google: 'googlef1a18aca7d0b5114',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "3DLab - 3Dプリンタ教室",
    "description": "東京都文京区湯島の3Dプリンタ教室。湯島駅から徒歩1分。御徒町・秋葉原・御茶ノ水から徒歩圏内。",
    "url": "https://3dlab.jp",
    "telephone": "080-9453-0911",
    "email": "y-sato@sunu25.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "文京区",
      "addressRegion": "東京都",
      "postalCode": "113-0034",
      "addressCountry": "JP",
      "streetAddress": "湯島3-14-8 加田湯島ビル 5F"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "35.7051736",
      "longitude": "139.7697007"
    },
    "openingHours": "Mo-Su 10:00-20:00",
    "priceRange": "¥¥",
    "areaServed": [
      "湯島",
      "御徒町",
      "秋葉原",
      "御茶ノ水",
      "文京区",
      "東京"
    ],
    "parentOrganization": [
      {
        "@type": "Organization",
        "name": "株式会社sunu",
        "url": "https://sunu25.com"
      },
      {
        "@type": "Organization",
        "name": "株式会社ウォーカー",
        "url": "https://walker.co.jp"
      }
    ]
  };

  return (
    <html lang="ja">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
