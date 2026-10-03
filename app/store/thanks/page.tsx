import type { Metadata } from 'next'
import StoreThanksView from '@/components/store/StoreThanksView'

export const metadata: Metadata = {
  title: 'ご購入ありがとうございます',
  robots: { index: false },
}

interface Props {
  /** checkout … カート（いまの決済）。order … カート導入前の1点決済 */
  searchParams: Promise<{ checkout?: string; order?: string }>
}

/** 決済のあとに戻ってくるページ（日本語）。中身は英語のページ（app/store/en/thanks）と共通 */
export default async function StoreThanksPage({ searchParams }: Props) {
  const { checkout, order } = await searchParams
  return <StoreThanksView locale="ja" checkoutId={checkout} orderId={order} />
}
