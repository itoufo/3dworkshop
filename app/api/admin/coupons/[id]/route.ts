import { handleAdminGet, handleAdminUpdate } from '@/lib/admin-rows'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Context) {
  const { id } = await params
  return handleAdminGet('coupons', id)
}

export async function PATCH(req: Request, { params }: Context) {
  const { id } = await params
  return handleAdminUpdate('coupons', id, req)
}
