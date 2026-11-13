import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'shop') return NextResponse.json({ error: 'Shop access required.' }, { status: 403 })
  const body = await request.json()
  const requestId = Number(body.requestId)
  const price = Number(body.price)
  if (!Number.isInteger(requestId) || requestId <= 0 || !Number.isFinite(price) || price <= 0 || price > 10_000_000) {
    return NextResponse.json({ error: 'Enter a valid repair request and price.' }, { status: 400 })
  }
  const shop = db.prepare('SELECT id,name FROM shop_profiles WHERE owner_user_id=?').get(session.user.id) as { id:number; name:string } | undefined
  if (!shop) return NextResponse.json({ error: 'Complete your shop profile before quoting.' }, { status: 400 })

  const estimate = String(body.estimate || '').trim()
  const timing = String(body.timing || '').trim()
  const warranty = String(body.warranty || '').trim()
  if (estimate.length > 2000 || timing.length > 120 || warranty.length > 300) {
    return NextResponse.json({ error: 'Estimate, timing, or warranty text is too long.' }, { status: 400 })
  }
  const repair = db.prepare('SELECT id,user_id,service,status FROM repair_requests WHERE id=?').get(requestId) as any
  if (!repair || repair.status !== 'open') return NextResponse.json({ error: 'This repair request is no longer open.' }, { status: 409 })
  if (repair.user_id === session.user.id) return NextResponse.json({ error: 'You cannot quote your own repair request.' }, { status: 403 })

  const now = new Date().toISOString()
  try {
    const create = db.transaction(() => {
      const result = db.prepare(`INSERT INTO quotes(repair_request_id,shop_id,price,estimate,timing,warranty,status,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?)`).run(requestId, shop.id, price, estimate || null, timing || null, warranty || null, 'pending', now, now)
      db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
        .run(repair.user_id, 'New quote received', `${shop.name} sent a $${price.toFixed(2)} quote for ${repair.service}.`, now)
      return db.prepare('SELECT * FROM quotes WHERE id=?').get(result.lastInsertRowid)
    })()
    return NextResponse.json({ quote: create }, { status: 201 })
  } catch (error) {
    if ((error as { code?:string })?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Your shop has already quoted this request.' }, { status: 409 })
    }
    console.error('Quote submission failed:', error)
    return NextResponse.json({ error: 'Unable to submit quote right now.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'customer') return NextResponse.json({ error: 'Only customers can decide on quotes.' }, { status: 403 })
  const body = await request.json()
  const quoteId = Number(body.id)
  const nextStatus = String(body.status || '')
  if (!Number.isInteger(quoteId) || quoteId <= 0) return NextResponse.json({ error: 'A valid quote is required.' }, { status: 400 })
  if (!['accepted','declined'].includes(nextStatus)) return NextResponse.json({ error: 'Choose accept or decline.' }, { status: 400 })

  const quote = db.prepare(`SELECT q.*,r.user_id as customer_id,r.service,r.id as request_id,r.status as request_status,
      s.owner_user_id as shop_owner_id
    FROM quotes q JOIN repair_requests r ON r.id=q.repair_request_id
    JOIN shop_profiles s ON s.id=q.shop_id WHERE q.id=? AND r.user_id=?`).get(quoteId, session.user.id) as any
  if (!quote) return NextResponse.json({ error: 'Quote not found.' }, { status: 404 })
  if (quote.status !== 'pending' || quote.request_status !== 'open') {
    return NextResponse.json({ error: 'This quote is no longer available for a decision.' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const decide = db.transaction(() => {
    if (nextStatus === 'accepted') {
      const updatedRequest = db.prepare("UPDATE repair_requests SET status='accepted',selected_quote_id=?,updated_at=? WHERE id=? AND user_id=? AND status='open'")
        .run(quote.id, now, quote.request_id, session.user.id)
      if (!updatedRequest.changes) return false
      const otherShops = db.prepare(`SELECT s.owner_user_id FROM quotes q JOIN shop_profiles s ON s.id=q.shop_id
        WHERE q.repair_request_id=? AND q.id<>? AND q.status='pending'`).all(quote.request_id, quote.id) as { owner_user_id:string }[]
      db.prepare("UPDATE quotes SET status='declined',updated_at=? WHERE repair_request_id=? AND id<>? AND status='pending'")
        .run(now, quote.request_id, quote.id)
      const notify = db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
      for (const shop of otherShops) notify.run(shop.owner_user_id, 'Quote not selected', `The customer selected another quote for their ${quote.service} request.`, now)
      db.prepare("UPDATE quotes SET status='accepted',updated_at=? WHERE id=? AND status='pending'").run(now, quote.id)
      notify.run(quote.shop_owner_id, 'Quote accepted', `Your $${Number(quote.price).toFixed(2)} quote for ${quote.service} was accepted.`, now)
    } else {
      const updated = db.prepare("UPDATE quotes SET status='declined',updated_at=? WHERE id=? AND status='pending'").run(now, quote.id)
      if (!updated.changes) return false
      db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
        .run(quote.shop_owner_id, 'Quote declined', `Your quote for ${quote.service} was declined.`, now)
    }
    return db.prepare('SELECT * FROM quotes WHERE id=?').get(quote.id)
  })()
  if (!decide) return NextResponse.json({ error: 'This quote has already been updated.' }, { status: 409 })
  return NextResponse.json({ quote: decide })
}
