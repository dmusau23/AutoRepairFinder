import { redirect } from 'next/navigation'
import { getSession, requireRole } from '@/lib/auth'
import AdminDashboard from '@/components/admin-dashboard'

export default async function AdminHome() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in?next=/admin')
  try { await requireRole('admin') } catch { redirect('/customer') }
  return <AdminDashboard name={session.user.name} />
}