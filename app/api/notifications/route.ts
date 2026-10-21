import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(request: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json()
  const now = new Date().toISOString()
  if (b.all) db.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').run(now, s.user.id)
  else if (b.id) db.prepare('UPDATE notifications SET read_at=? WHERE id=? AND user_id=?').run(now, Number(b.id), s.user.id)
  return NextResponse.json({ ok: true })
}
