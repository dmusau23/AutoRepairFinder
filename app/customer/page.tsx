import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard'
import { consumeFirstVisit, getSession, requireRole } from '@/lib/auth'

export default async function CustomerHome() {
  const session = await getSession()
  if (!session?.user) redirect('/sign-in?next=/customer')
  try {
    await requireRole('customer')
  } catch {
    redirect('/shop')
  }
  return <Dashboard initialRole="Customer" userName={session.user.name} firstVisit={consumeFirstVisit(session.user.id)} />
}
