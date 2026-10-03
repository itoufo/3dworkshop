import type { Metadata } from 'next'
import StoreThanksView from '@/components/store/StoreThanksView'

export const metadata: Metadata = {
  title: 'Thank you for your purchase',
  robots: { index: false },
}

interface Props {
  searchParams: Promise<{ checkout?: string; order?: string }>
}

/** 決済のあとに戻ってくるページ（英語）。英語のカートから決済すると、Stripe がここへ戻す */
export default async function StoreEnglishThanksPage({ searchParams }: Props) {
  const { checkout, order } = await searchParams
  return (
    <div lang="en">
      <StoreThanksView locale="en" checkoutId={checkout} orderId={order} />
    </div>
  )
}
