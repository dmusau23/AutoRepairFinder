import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json()
  if (!String(b.service || '').trim() || !String(b.description || '').trim()) return NextResponse.json({ error: 'Service and description are required.' }, { status: 400 })

  const vehicleId = b.vehicleId ? Number(b.vehicleId) : null
  const now = new Date().toISOString()
  if (vehicleId && !db.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').get(vehicleId, s.user.id)) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 400 })

  const r = db.prepare(`INSERT INTO repair_requests(user_id,vehicle_id,service,description,symptoms,status,distance,timing,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
    .run(s.user.id, vehicleId, String(b.service).trim(), String(b.description).trim(), '[]', 'open', 'Within 10 miles', String(b.timing || 'Flexible'), now, now)

  const requestRow = db.prepare('SELECT * FROM repair_requests WHERE id=?').get(r.lastInsertRowid) as any
  const shops = db.prepare(`SELECT owner_user_id FROM shop_profiles WHERE owner_user_id <> ?`).all(s.user.id) as any[]
  const notify = db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
  for (const shop of shops) {
    notify.run(shop.owner_user_id, 'New repair request', `${s.user.name} posted a ${requestRow.service} request. Review it and send a quote.`, now)
  }
  return NextResponse.json({ request: requestRow }, { status: 201 })
}

export async function PATCH(request: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json()
  const row = db.prepare('SELECT * FROM repair_requests WHERE id=? AND user_id=?').get(Number(b.id), s.user.id) as any
  if (!row) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  if (b.status === 'cancelled') {
    if (s.role !== 'customer') return NextResponse.json({ error: 'Only customers can cancel a repair request.' }, { status: 403 })
    if (row.status !== 'open') return NextResponse.json({ error: 'Only open repair requests can be cancelled.' }, { status: 409 })
    const now = new Date().toISOString()
    const cancelled = db.transaction(() => {
      const result = db.prepare("UPDATE repair_requests SET status='cancelled',updated_at=? WHERE id=? AND user_id=? AND status='open'").run(now, Number(b.id), s.user.id)
      if (!result.changes) return false
      const shops = db.prepare(`SELECT DISTINCT s.owner_user_id FROM quotes q JOIN shop_profiles s ON s.id=q.shop_id WHERE q.repair_request_id=? AND q.status='pending'`).all(Number(b.id)) as any[]
      db.prepare("UPDATE quotes SET status='declined',updated_at=? WHERE repair_request_id=? AND status='pending'").run(now, Number(b.id))
      const notify = db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
      for (const shop of shops) notify.run(shop.owner_user_id, 'Repair request cancelled', `The customer cancelled their ${row.service} repair request.`, now)
      return true
    })()
    if (!cancelled) return NextResponse.json({ error: 'This repair request is no longer open.' }, { status: 409 })
    return NextResponse.json({ request: db.prepare('SELECT * FROM repair_requests WHERE id=?').get(Number(b.id)) })
  }
  db.prepare(`UPDATE repair_requests SET service=COALESCE(?,service),description=COALESCE(?,description),vehicle_id=COALESCE(?,vehicle_id),status=COALESCE(?,status),updated_at=? WHERE id=? AND user_id=?`)
    .run(b.service?.trim() || null, b.description?.trim() || null, b.vehicleId ? Number(b.vehicleId) : null, null, new Date().toISOString(), Number(b.id), s.user.id)
  return NextResponse.json({ request: db.prepare('SELECT * FROM repair_requests WHERE id=?').get(Number(b.id)) })
}

export async function DELETE(request: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await request.json()
  db.prepare('DELETE FROM repair_requests WHERE id=? AND user_id=?').run(Number(id), s.user.id)
  return NextResponse.json({ ok: true })
}
