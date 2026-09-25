import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { currentStoreUser } from '@/lib/store/session'
import { checkSellerEligibility } from '@/lib/store/eligibility'
import { MAIN_SITE_URL, SELLER_MIN_ENROLLED_MONTHS } from '@/lib/store/urls'
import { PRODUCT_STATUS_LABEL, type ProductStatus } from '@/lib/store/product-rules'
import SellNav from '@/components/store/SellNav'
import ApplyForm from './ApplyForm'

export const metadata: Metadata = {
  title: '出品者メニュー',
  robots: { index: false, follow: false },
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">{children}</div>
}

export default async function SellPage() {
  const user = await currentStoreUser()
  if (!user) redirect('/login?next=%2Fsell')

  const seller = user.seller

  if (seller?.status === 'approved') {
    const { data: products } = await supabaseAdmin!
      .from('store_products')
      .select('status')
      .eq('seller_id', seller.id)
    const counts = new Map<string, number>()
    for (const p of products ?? []) counts.set(p.status, (counts.get(p.status) ?? 0) + 1)

    return (
      <Panel>
        <SellNav current="home" title={`${seller.displayName} さん`} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(['published', 'pending_review', 'rejected', 'draft'] as ProductStatus[]).map((s) => (
            <div key={s} className="rounded-xl border border-gray-200 p-4">
              <p className="text-base text-gray-600">{PRODUCT_STATUS_LABEL[s]}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{counts.get(s) ?? 0}</p>
            </div>
          ))}
        </div>
        {(counts.get('rejected') ?? 0) > 0 && (
          <p className="mt-6 text-base text-amber-700">
            差し戻しの作品があります。作品の一覧でコメントを確認して、直してから審査に出してください。
          </p>
        )}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sell/products/new" className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
            作品を登録する
          </Link>
          <Link href={`/s/${seller.slug}`} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold">
            自分の出品者ページ
          </Link>
        </div>
        <p className="mt-10 text-base text-gray-600">
          売上と支払い申請の画面は準備中です。
        </p>
      </Panel>
    )
  }

  if (seller?.status === 'applied') {
    return (
      <Panel>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">審査中です</h1>
        <p className="mt-4 text-base text-gray-700">
          出品者の申請を受け付けました。承認されたらメール（{user.email}）でお知らせします。
        </p>
      </Panel>
    )
  }

  if (seller?.status === 'suspended') {
    return (
      <Panel>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">出品を停止しています</h1>
        <p className="mt-4 text-base text-gray-700">
          くわしくは 3dlab@sunu25.com までお問い合わせください。
        </p>
      </Panel>
    )
  }

  // 未申請・却下 → 資格を確かめて申請フォームか案内を出す
  const eligibility = await checkSellerEligibility(user.customerId)
  const canApply = eligibility.verified || eligibility.unverifiedEnrollment

  return (
    <Panel>
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">作品を出品する</h1>
      <p className="mt-4 text-base text-gray-700">
        3DLab のスクールに{SELLER_MIN_ENROLLED_MONTHS}ヶ月以上在籍している方は、自分でつくった 3D データを出品できます。
        出品者の登録と、作品の掲載は、それぞれ審査のうえで行います。
      </p>

      {seller?.status === 'rejected' && (
        <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 p-4 text-base text-amber-900">
          前回の申請は承認されませんでした。内容を見直して、もう一度申請できます。
        </div>
      )}

      {canApply ? (
        <>
          {!eligibility.verified && (
            <p className="mt-6 text-base text-gray-600">
              在籍をオンラインの決済記録で確かめられなかったため、承認の前にスタッフが確認します。
            </p>
          )}
          <ApplyForm />
        </>
      ) : (
        <div className="mt-8 rounded-xl border border-gray-200 p-6">
          <p className="text-base text-gray-800">
            ログイン中のアカウント（{user.email}）では、{SELLER_MIN_ENROLLED_MONTHS}ヶ月以上のスクール在籍を確認できませんでした。
          </p>
          <p className="mt-2 text-base text-gray-600">
            スクールに申し込んだときと同じメールアドレスでログインしているかご確認ください。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`${MAIN_SITE_URL}/school`} className="px-6 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold">
              スクールを見る
            </a>
            <a href={`${MAIN_SITE_URL}/workshops`} className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-bold">
              体験ワークショップ
            </a>
          </div>
        </div>
      )}
    </Panel>
  )
}
