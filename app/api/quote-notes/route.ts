import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'customer') return NextResponse.json({ error: 'Only customers can save quote notes.' }, { status: 403 })

  const body = await request.json()
  const quoteId = Number(body.quoteId)
  const note = String(body.note ?? '').trim()
  if (!Number.isInteger(quoteId) || quoteId <= 0) return NextResponse.json({ error: 'A valid quote is required.' }, { status: 400 })
  if (note.length > 1000) return NextResponse.json({ error: 'Notes must be 1,000 characters or fewer.' }, { status: 400 })

  const quote = db.prepare(`SELECT q.id FROM quotes q
    JOIN repair_requests r ON r.id=q.repair_request_id
    WHERE q.id=? AND r.user_id=?`).get(quoteId, session.user.id)
  if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })

  if (!note) {
    db.prepare('DELETE FROM quote_notes WHERE quote_id=? AND user_id=?').run(quoteId, session.user.id)
  } else {
    db.prepare(`INSERT INTO quote_notes(quote_id,user_id,note,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(quote_id,user_id) DO UPDATE SET note=excluded.note,updated_at=excluded.updated_at`)
      .run(quoteId, session.user.id, note, new Date().toISOString())
  }

  return NextResponse.json({ quoteId, note })
}
