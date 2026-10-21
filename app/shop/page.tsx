import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard'
import { consumeFirstVisit, getSession, requireRole } from '@/lib/auth'

export default async function ShopHome() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in?next=/shop')
  try {
    await requireRole('shop')
  } catch {
    redirect('/customer')
  }
  return <Dashboard initialRole="Shop" userName={session.user.name} firstVisit={consumeFirstVisit(session.user.id)} />
}
