import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

function notifyRequestCancelled(requestId: number, service: string, now: string) {
  const shops = db.prepare(`SELECT DISTINCT s.owner_user_id FROM quotes q
    JOIN shop_profiles s ON s.id=q.shop_id WHERE q.repair_request_id=? AND q.status='pending'`).all(requestId) as { owner_user_id: string }[]
  db.prepare("UPDATE quotes SET status='declined',updated_at=? WHERE repair_request_id=? AND status='pending'").run(now, requestId)
  const notify = db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
  for (const shop of shops) notify.run(shop.owner_user_id, 'Repair request cancelled', `The customer cancelled their ${service} repair request.`, now)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'customer') return NextResponse.json({ error: 'Only customers can create repair requests.' }, { status: 403 })
  const body = await request.json()
  const service = String(body.service || '').trim()
  const description = String(body.description || '').trim()
  if (!service || service.length > 120 || !description || description.length > 3000) {
    return NextResponse.json({ error: 'Enter a service (up to 120 characters) and description (up to 3,000 characters).' }, { status: 400 })
  }

  const vehicleId = body.vehicleId == null || body.vehicleId === '' ? null : Number(body.vehicleId)
  if (vehicleId !== null && (!Number.isInteger(vehicleId) || !db.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').get(vehicleId, session.user.id))) {
    return NextResponse.json({ error: 'Select a vehicle from your garage.' }, { status: 400 })
  }

  const timing = String(body.timing || 'Flexible').trim()
  if (timing.length > 80) return NextResponse.json({ error: 'Timing must be 80 characters or fewer.' }, { status: 400 })
  const now = new Date().toISOString()
  const create = db.transaction(() => {
    const result = db.prepare(`INSERT INTO repair_requests(user_id,vehicle_id,service,description,symptoms,status,distance,timing,created_at,updated_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)`).run(session.user.id, vehicleId, service, description, '[]', 'open', null, timing || 'Flexible', now, now)
    const requestRow = db.prepare('SELECT * FROM repair_requests WHERE id=?').get(result.lastInsertRowid) as any
    const shopOwners = db.prepare('SELECT owner_user_id FROM shop_profiles').all() as { owner_user_id: string }[]
    const notify = db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
    for (const shop of shopOwners) notify.run(shop.owner_user_id, 'New repair request', `${session.user.name} posted a ${service} request. Review it and send a quote.`, now)
    return requestRow
  })()
  return NextResponse.json({ request: create }, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'customer') return NextResponse.json({ error: 'Only customers can update repair requests.' }, { status: 403 })
  const body = await request.json()
  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid request is required.' }, { status: 400 })
  const row = db.prepare('SELECT * FROM repair_requests WHERE id=? AND user_id=?').get(id, session.user.id) as any
  if (!row) return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
  if (row.status !== 'open') return NextResponse.json({ error: 'Only open repair requests can be changed.' }, { status: 409 })

  const now = new Date().toISOString()
  if (body.status === 'cancelled') {
    const cancel = db.transaction(() => {
      const result = db.prepare("UPDATE repair_requests SET status='cancelled',updated_at=? WHERE id=? AND user_id=? AND status='open'").run(now, id, session.user.id)
      if (!result.changes) return false
      notifyRequestCancelled(id, row.service, now)
      return true
    })()
    if (!cancel) return NextResponse.json({ error: 'This request is no longer open.' }, { status: 409 })
    return NextResponse.json({ request: db.prepare('SELECT * FROM repair_requests WHERE id=?').get(id) })
  }
  if (body.status !== undefined) return NextResponse.json({ error: 'Invalid request status.' }, { status: 400 })

  const service = body.service === undefined ? row.service : String(body.service).trim()
  const description = body.description === undefined ? row.description : String(body.description).trim()
  if (!service || service.length > 120 || !description || description.length > 3000) return NextResponse.json({ error: 'Enter a service and description within the stated limits.' }, { status: 400 })
  let vehicleId: number | null = row.vehicle_id
  if (body.vehicleId !== undefined) {
    vehicleId = body.vehicleId === null || body.vehicleId === '' ? null : Number(body.vehicleId)
    if (vehicleId !== null && (!Number.isInteger(vehicleId) || !db.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').get(vehicleId, session.user.id))) {
      return NextResponse.json({ error: 'Select a vehicle from your garage.' }, { status: 400 })
    }
  }
  db.prepare('UPDATE repair_requests SET service=?,description=?,vehicle_id=?,updated_at=? WHERE id=? AND user_id=? AND status=\'open\'')
    .run(service, description, vehicleId, now, id, session.user.id)
  return NextResponse.json({ request: db.prepare('SELECT * FROM repair_requests WHERE id=?').get(id) })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'customer') return NextResponse.json({ error: 'Only customers can delete repair requests.' }, { status: 403 })
  const body = await request.json()
  const id = Number(body.id)
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid request is required.' }, { status: 400 })
  const row = db.prepare("SELECT id FROM repair_requests WHERE id=? AND user_id=? AND status='open'").get(id, session.user.id)
  if (!row) return NextResponse.json({ error: 'Only your open requests can be deleted.' }, { status: 404 })
  db.prepare("DELETE FROM repair_requests WHERE id=? AND user_id=? AND status='open'").run(id, session.user.id)
  return NextResponse.json({ ok: true })
}
