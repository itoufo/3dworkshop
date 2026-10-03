import { handleAdminInsert, handleAdminList } from '@/lib/admin-rows'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  return handleAdminList('workshop_categories', req)
}

export async function POST(req: Request) {
  return handleAdminInsert('workshop_categories', req)
}
