import 'server-only'
import { redirect } from 'next/navigation'
import { currentStoreUser, type StoreUser } from './session'

/** セラー管理画面のページ用。ログインしていなければログインへ、承認前なら /sell へ戻す */
export async function approvedSellerOrRedirect(nextPath: string): Promise<
  StoreUser & { seller: NonNullable<StoreUser['seller']> }
> {
  const user = await currentStoreUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  if (!user.seller || user.seller.status !== 'approved') redirect('/sell')
  return user as StoreUser & { seller: NonNullable<StoreUser['seller']> }
}
