import { handleAdminDelete } from '@/lib/admin-delete'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return handleAdminDelete('workshops', id)
}
