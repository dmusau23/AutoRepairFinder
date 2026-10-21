import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const s = await getSession()
  if (!s || s.role !== 'shop') return NextResponse.json({ error: 'Shop access required.' }, { status: 403 })
  const b = await request.json()
  const price = Number(b.price)
  if (!b.requestId || !Number.isFinite(price) || price <= 0) return NextResponse.json({ error: 'Request and valid price are required.' }, { status: 400 })

  const shop = db.prepare('SELECT id, name FROM shop_profiles WHERE owner_user_id=?').get(s.user.id) as any
  if (!shop) return NextResponse.json({ error: 'Create a shop profile first.' }, { status: 400 })
  const req = db.prepare('SELECT id,user_id,service,status FROM repair_requests WHERE id=?').get(Number(b.requestId)) as any
  if (!req || req.status !== 'open') return NextResponse.json({ error: 'Open repair request not found.' }, { status: 404 })

  const now = new Date().toISOString()
  try {
    const r = db.prepare(`INSERT INTO quotes(repair_request_id,shop_id,price,estimate,timing,warranty,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`)
      .run(Number(b.requestId), shop.id, price, b.estimate?.trim() || null, b.timing?.trim() || null, b.warranty?.trim() || null, 'pending', now, now)

    db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
      .run(req.user_id, 'New quote received', `${shop.name} sent you a $${price.toFixed(2)} quote for ${req.service}.`, now)

    return NextResponse.json({ quote: db.prepare('SELECT * FROM quotes WHERE id=?').get(r.lastInsertRowid) }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'You already quoted this request.' }, { status: 409 })
  }
}

export async function PATCH(request: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json()
  const quote = db.prepare(`SELECT q.*, r.user_id as customer_id, r.service, r.id as request_id, s.name as shop_name, s.owner_user_id as shop_owner_id
    FROM quotes q JOIN repair_requests r ON r.id=q.repair_request_id JOIN shop_profiles s ON s.id=q.shop_id WHERE q.id=?`).get(Number(b.id)) as any
  if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })

  const nextStatus = String(b.status || '')
  if (!['accepted', 'declined'].includes(nextStatus)) return NextResponse.json({ error: 'Invalid quote status.' }, { status: 400 })
  const isCustomer = s.user.id === quote.customer_id
  const isShop = s.user.id === quote.shop_owner_id
  if (!isCustomer && !isShop) return NextResponse.json({ error: 'You cannot update this quote.' }, { status: 403 })

  const now = new Date().toISOString()
  const update = db.transaction(() => {
    db.prepare('UPDATE quotes SET status=?,updated_at=? WHERE id=?').run(nextStatus, now, quote.id)
    if (isCustomer && nextStatus === 'accepted') {
      db.prepare(`UPDATE quotes SET status='declined',updated_at=? WHERE repair_request_id=? AND id<>? AND status='pending'`).run(now, quote.request_id, quote.id)
      db.prepare(`UPDATE repair_requests SET status='accepted',selected_quote_id=?,updated_at=? WHERE id=?`).run(quote.id, now, quote.request_id)
      db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
        .run(quote.shop_owner_id, 'Quote accepted', `Your $${Number(quote.price).toFixed(2)} quote for ${quote.service} was accepted by the customer.`, now)
    } else if (isCustomer && nextStatus === 'declined') {
      db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
        .run(quote.shop_owner_id, 'Quote declined', `Your quote for ${quote.service} was declined by the customer.`, now)
    }
    return db.prepare('SELECT * FROM quotes WHERE id=?').get(quote.id)
  })()
  return NextResponse.json({ quote: update })
}
