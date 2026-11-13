import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard'
import { consumeFirstVisit, getSession, requireRole } from '@/lib/auth'

export default async function ShopHome() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in?next=/shop')
  if (session.role === 'admin') redirect('/admin')
  if (session.role === 'customer') redirect('/customer')
  try {
    await requireRole('shop')
  } catch { redirect('/') }
  return <Dashboard initialRole="Shop" userName={session.user.name} firstVisit={consumeFirstVisit(session.user.id)} />
}
