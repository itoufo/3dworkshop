import type { Metadata } from 'next'
import StoreProductView, { storeProductMetadata } from '@/components/store/StoreProductView'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return storeProductMetadata((await params).id, 'ja')
}

/** 作品ページ（日本語）。中身は英語のページ（app/store/en/p/[id]）と共通 */
export default async function StoreProductPage({ params }: Props) {
  return <StoreProductView id={(await params).id} locale="ja" />
}
