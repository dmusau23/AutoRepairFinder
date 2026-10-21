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
        FROM repair_requests r LEFT JOIN vehicles v ON v.id=r.vehicle_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC`).all()
    : db.prepare(`SELECT r.*,v.year,v.make,v.model,
        (SELECT COUNT(*) FROM quotes q2 WHERE q2.repair_request_id=r.id) as quote_count
        FROM repair_requests r LEFT JOIN vehicles v ON v.id=r.vehicle_id WHERE r.user_id=? ORDER BY r.created_at DESC`).all(uid)

  const vehicles = db.prepare('SELECT * FROM vehicles WHERE user_id=? ORDER BY created_at DESC').all(uid)
  const savedShops = db.prepare('SELECT * FROM saved_shops WHERE user_id=? ORDER BY created_at DESC').all(uid)
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30').all(uid)
  const shops = (db.prepare('SELECT * FROM shop_profiles ORDER BY rating DESC').all() as any[]).map(x => ({ ...x, services: parse(x.services) }))
  const requestIds = (requests as any[]).map(r => r.id)
  const quotes = requestIds.length
    ? s.role === 'customer'
      ? db.prepare(`SELECT q.*,s.name as shop_name,s.rating,s.review_count,s.owner_user_id as shop_owner_user_id,qn.note as customer_note
          FROM quotes q JOIN shop_profiles s ON s.id=q.shop_id
          LEFT JOIN quote_notes qn ON qn.quote_id=q.id AND qn.user_id=?
          WHERE q.repair_request_id IN (${requestIds.map(() => '?').join(',')}) ORDER BY q.created_at DESC`).all(uid, ...requestIds)
      : db.prepare(`SELECT q.*,s.name as shop_name,s.rating,s.review_count,s.owner_user_id as shop_owner_user_id
          FROM quotes q JOIN shop_profiles s ON s.id=q.shop_id
          WHERE q.repair_request_id IN (${requestIds.map(() => '?').join(',')}) ORDER BY q.created_at DESC`).all(...requestIds)
    : []
  const shopProfile = db.prepare('SELECT * FROM shop_profiles WHERE owner_user_id=?').get(uid) as any

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
    const shop = db.prepare('SELECT id,name FROM shop_profiles WHERE id=?').get(Number(b.shopId)) as any
    if (!shop) return NextResponse.json({ error: 'Shop not found.' }, { status: 404 })
    try {
      const r = db.prepare('INSERT INTO saved_shops(user_id,shop_id,shop,created_at) VALUES(?,?,?,?)').run(s.user.id, shop.id, shop.name, now)
      return NextResponse.json({ savedShop: db.prepare('SELECT * FROM saved_shops WHERE id=?').get(r.lastInsertRowid) }, { status: 201 })
    } catch { return NextResponse.json({ error: 'Shop already saved.' }, { status: 409 }) }
  }
  return NextResponse.json({ error: 'Unknown dashboard action' }, { status: 400 })
}
