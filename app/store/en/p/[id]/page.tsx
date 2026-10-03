import type { Metadata } from 'next'
import StoreProductView, { storeProductMetadata } from '@/components/store/StoreProductView'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return storeProductMetadata((await params).id, 'en')
}

/**
 * 作品ページ（英語。stores.3dlab.jp/en/p/<id>）。
 * 英語なのは買い方・価格まわりの文言で、作品名・説明は出品者が書いたまま（日本語）出る。
 */
export default async function StoreEnglishProductPage({ params }: Props) {
  return (
    // <html lang="ja"> はルートレイアウトで固定なので、中身を lang="en" で包む（app/store/en/page.tsx と同じ）
    <div lang="en">
      <StoreProductView id={(await params).id} locale="en" />
    </div>
  )
}
