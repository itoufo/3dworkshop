import type { Metadata } from "next";
import { StructuredData, SchoolCourseSchema } from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "スクール・教室 | AI×3Dプリンタ教室 東京・湯島 | 3DLab",
  description: "東京都文京区湯島のAI×3Dプリンタ教室。自由創作クラス・基本実践クラスの2つのコースをご用意。有料版AIが使い放題、ワークショップ30％OFF、作品発表会参加券など特典多数。入会月は月謝無料。湯島駅徒歩1分。",
  keywords: "3Dプリンタ スクール,3Dプリンタ 教室,AI×3D,プログラミング教室,湯島,東京,文京区,子ども向け,月謝,入会金",
  alternates: {
    canonical: '/school',
  },
  openGraph: {
    title: "スクール・教室 | AI×3Dプリンタ教室 東京・湯島 | 3DLab",
    description: "東京都文京区湯島のAI×3Dプリンタ教室。自由創作クラス・基本実践クラスの2つのコースをご用意。有料版AIが使い放題、ワークショップ30％OFFなど特典多数。",
    url: 'https://3dlab.jp/school',
    siteName: "3DLab - 3Dプリンタ教室",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: '3DLab スクール・教室',
      },
    ],
    locale: "ja_JP",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "スクール・教室 | AI×3Dプリンタ教室 東京・湯島",
    description: "東京都文京区湯島のAI×3Dプリンタ教室。自由創作クラス・基本実践クラスの2つのコースをご用意。",
    images: ['/og-image.jpg'],
  },
};

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StructuredData data={SchoolCourseSchema()} />
      {children}
    </>
  );
}
