import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

const parse = (x: any) => { try { return JSON.parse(x || '[]') } catch { return [] } }

export async function GET() {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
  const uid = s.user.id
  const requests = s.role === 'shop'
    ? db.prepare(`SELECT r.*,v.year,v.make,v.model,u.name as customer_name,
        (SELECT COUNT(*) FROM quotes q2 WHERE q2.repair_request_id=r.id) as quote_count
        FROM repair_requests r LEFT JOIN vehicles v ON v.id=r.vehicle_id JOIN users u ON u.id=r.user_id
        WHERE r.status='open' ORDER BY r.created_at DESC`).all()
    : db.prepare(`SELECT r.*,v.year,v.make,v.model,
        (SELECT COUNT(*) FROM quotes q2 WHERE q2.repair_request_id=r.id) as quote_count
        FROM repair_requests r LEFT JOIN vehicles v ON v.id=r.vehicle_id WHERE r.user_id=? ORDER BY r.created_at DESC`).all(uid)

  const vehicles = db.prepare('SELECT * FROM vehicles WHERE user_id=? ORDER BY created_at DESC').all(uid)
  const savedShops = s.role === 'customer' ? db.prepare('SELECT * FROM saved_shops WHERE user_id=? ORDER BY created_at DESC').all(uid) : []
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(uid)
  const shops = (db.prepare('SELECT * FROM shop_profiles ORDER BY rating DESC').all() as any[]).map(x => ({ ...x, services: parse(x.services) }))
  const shopProfile = db.prepare('SELECT * FROM shop_profiles WHERE owner_user_id=?').get(uid) as any
  const requestIds = (requests as any[]).map(r => r.id)
  const quotes = s.role === 'shop'
    ? shopProfile
      ? db.prepare(`SELECT q.*,s.name as shop_name,s.rating,s.review_count,r.service as request_service,r.status as request_status,
          u.name as customer_name,v.year,v.make,v.model,v.trim
          FROM quotes q JOIN shop_profiles s ON s.id=q.shop_id JOIN repair_requests r ON r.id=q.repair_request_id
          JOIN users u ON u.id=r.user_id LEFT JOIN vehicles v ON v.id=r.vehicle_id
          WHERE q.shop_id=? ORDER BY q.created_at DESC`).all(shopProfile.id)
      : []
    : requestIds.length
      ? db.prepare(`SELECT q.*,s.name as shop_name,s.rating,s.review_count,s.owner_user_id as shop_owner_user_id,s.phone as shop_phone,s.email as shop_email,qn.note as customer_note,
          a.scheduled_at as appointment_scheduled_at,a.status as appointment_status,a.note as appointment_note,a.updated_at as appointment_updated_at,
          a.customer_response,a.customer_message,a.customer_updated_at
          FROM quotes q JOIN shop_profiles s ON s.id=q.shop_id
          LEFT JOIN quote_notes qn ON qn.quote_id=q.id AND qn.user_id=?
          LEFT JOIN appointments a ON a.quote_id=q.id
          WHERE q.repair_request_id IN (${requestIds.map(() => '?').join(',')}) ORDER BY q.created_at DESC`).all(uid, ...requestIds)
      : []

  return NextResponse.json({
    role: s.role,
    profile: { name: s.user.name, email: s.user.email, shopName: shopProfile?.name },
    requests, vehicles, savedShops, notifications, shops, quotes
  })
  } catch (error) {
    console.error('Dashboard load failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load dashboard data.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const b = await request.json()
  const now = new Date().toISOString()
  if (b.action === 'save-shop') {
    if (s.role !== 'customer') return NextResponse.json({ error: 'Only customers can save shops.' }, { status: 403 })
    const shopId = Number(b.shopId)
    if (!Number.isInteger(shopId) || shopId <= 0) return NextResponse.json({ error: 'A valid shop is required.' }, { status: 400 })
    const shop = db.prepare('SELECT id,name FROM shop_profiles WHERE id=?').get(shopId) as any
    if (!shop) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
    try {
      const r = db.prepare('INSERT INTO saved_shops(user_id,shop_id,shop,created_at) VALUES(?,?,?,?)').run(s.user.id, shop.id, shop.name, now)
      return NextResponse.json({ savedShop: db.prepare('SELECT * FROM saved_shops WHERE id=?').get(r.lastInsertRowid) }, { status: 201 })
    } catch { return NextResponse.json({ error: 'Shop already saved.' }, { status: 409 }) }
  }
  return NextResponse.json({ error: 'Unknown dashboard action' }, { status: 400 })
}
