import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { approvedSellerOrRedirect } from '@/lib/store/seller-guard'
import SellNav from '@/components/store/SellNav'
import ProfileForm from './ProfileForm'

export const metadata: Metadata = { title: 'プロフィール', robots: { index: false, follow: false } }

export default async function SellProfilePage() {
  const user = await approvedSellerOrRedirect('/sell/profile')
  const { data: seller } = await supabaseAdmin!
    .from('store_sellers')
    .select('display_name, slug, bio, avatar_url')
    .eq('id', user.seller.id)
    .single()

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <SellNav current="profile" title="プロフィール" />
      <p className="text-base text-gray-600 mb-6">出品者ページ: stores.3dlab.jp/s/{seller?.slug}</p>
      <ProfileForm
        initial={{
          display_name: seller?.display_name ?? '',
          bio: seller?.bio ?? '',
          avatar_url: seller?.avatar_url ?? null,
        }}
      />
    </div>
  )
}
