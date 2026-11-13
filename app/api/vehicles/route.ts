import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

const text = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
const isCustomer = (role: string) => role === 'customer'
const validMileage = (value: unknown) => value == null || value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2_000_000)

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isCustomer(session.role)) return NextResponse.json({ error: 'Customer account required.' }, { status: 403 })
  const vehicles = db.prepare('SELECT * FROM vehicles WHERE user_id=? ORDER BY created_at DESC').all(session.user.id)
  return NextResponse.json({ vehicles })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isCustomer(session.role)) return NextResponse.json({ error: 'Customer account required.' }, { status: 403 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const year = Number(body?.year), mileage = body?.mileage == null || body.mileage === '' ? null : Number(body.mileage)
  const make = text(body?.make, 80), model = text(body?.model, 100), trim = text(body?.trim, 100), vin = text(body?.vin, 30)
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1 || !make || !model || !validMileage(body?.mileage)) return NextResponse.json({ error: 'Enter a valid year, make, model, and mileage.' }, { status: 400 })
  const now = new Date().toISOString()
  const result = db.prepare('INSERT INTO vehicles(user_id,year,make,model,trim,mileage,vin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(session.user.id, year, make, model, trim || null, mileage, vin || null, now, now)
  return NextResponse.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id=?').get(result.lastInsertRowid) }, { status: 201 })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isCustomer(session.role)) return NextResponse.json({ error: 'Customer account required.' }, { status: 403 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Valid vehicle ID is required.' }, { status: 400 })
  const current = db.prepare('SELECT id FROM vehicles WHERE id=? AND user_id=?').get(id, session.user.id)
  if (!current) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
  const year = Number(body.year), mileage = body.mileage == null || body.mileage === '' ? null : Number(body.mileage)
  const make = text(body.make, 80), model = text(body.model, 100), trim = text(body.trim, 100), vin = text(body.vin, 30)
  if (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 1 || !make || !model || !validMileage(body.mileage)) return NextResponse.json({ error: 'Enter a valid year, make, model, and mileage.' }, { status: 400 })
  db.prepare('UPDATE vehicles SET year=?,make=?,model=?,trim=?,mileage=?,vin=?,updated_at=? WHERE id=? AND user_id=?').run(year, make, model, trim || null, mileage, vin || null, new Date().toISOString(), id, session.user.id)
  return NextResponse.json({ vehicle: db.prepare('SELECT * FROM vehicles WHERE id=?').get(id) })
}

export async function DELETE(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isCustomer(session.role)) return NextResponse.json({ error: 'Customer account required.' }, { status: 403 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  const id = Number(body?.id)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: 'Valid vehicle ID is required.' }, { status: 400 })
  const result = db.prepare('DELETE FROM vehicles WHERE id=? AND user_id=?').run(id, session.user.id)
  if (!result.changes) return NextResponse.json({ error: 'Vehicle not found.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
