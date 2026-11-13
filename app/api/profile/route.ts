import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

function shopProfile(userId: string) {
  const shop = db.prepare('SELECT * FROM shop_profiles WHERE owner_user_id=?').get(userId) as any
  if (shop) { try { shop.services = JSON.parse(shop.services || '[]') } catch { shop.services = [] } }
  return shop || null
}

function validImage(value: unknown) {
  return value === null || value === '' || (typeof value === 'string' && value.length <= 1_400_000 && /^data:image\/(png|jpeg|webp);base64,/.test(value))
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const shop = shopProfile(session.user.id)
  const profile = db.prepare('SELECT profile_image FROM user_profiles WHERE user_id=?').get(session.user.id) as any
  return NextResponse.json({ role: session.role, user: session.user, profileImage: profile?.profile_image || '', shop })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const image = body.profileImage
  if (image !== undefined && !validImage(image)) return NextResponse.json({ error: 'Profile image must be a PNG, JPEG, or WebP under 1 MB.' }, { status: 400 })
  const hasIdentity = body.name !== undefined || body.email !== undefined
  const name = hasIdentity ? String(body.name ?? session.user.name).trim() : session.user.name
  const email = hasIdentity ? String(body.email ?? session.user.email).trim().toLowerCase() : session.user.email
  if (hasIdentity && (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return NextResponse.json({ error: 'Enter a valid name and email.' }, { status: 400 })

  let shop: any
  let shopImage: unknown
  let shopFields: any
  if (session.role === 'shop' && body.shop !== undefined) {
    const value = body.shop
    if (!value || typeof value !== 'object' || Array.isArray(value)) return NextResponse.json({ error: 'Invalid shop profile.' }, { status: 400 })
    shopImage = value.profileImage
    if (shopImage !== undefined && !validImage(shopImage)) return NextResponse.json({ error: 'Shop image must be a PNG, JPEG, or WebP under 1 MB.' }, { status: 400 })
    const services = Array.isArray(value.services) ? value.services : String(value.services || '').split(',')
    shopFields = {
      name: String(value.name || '').trim() || `${name}'s Auto Shop`,
      description: String(value.description || '').trim().slice(0, 2000),
      address: String(value.address || '').trim().slice(0, 250),
      city: String(value.city || '').trim().slice(0, 100),
      state: String(value.state || '').trim().slice(0, 100),
      postal: String(value.postal_code || '').trim().slice(0, 20),
      phone: String(value.phone || '').trim().slice(0, 40),
      email: String(value.email || email).trim().slice(0, 254),
      services: JSON.stringify(services.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 30)),
    }
  }

  const now = new Date().toISOString()
  try {
    db.transaction(() => {
      if (hasIdentity) db.prepare('UPDATE users SET name=?,email=? WHERE id=?').run(name, email, session.user.id)
      if (image !== undefined) db.prepare('UPDATE user_profiles SET profile_image=?,updated_at=? WHERE user_id=?').run(image || null, now, session.user.id)
      if (hasIdentity && session.role === 'shop') db.prepare('UPDATE shop_profiles SET email=?,updated_at=? WHERE owner_user_id=?').run(email, now, session.user.id)
      if (shopFields) db.prepare(`UPDATE shop_profiles SET name=?,description=?,address=?,city=?,state=?,postal_code=?,phone=?,email=?,services=?,profile_image=?,updated_at=? WHERE owner_user_id=?`)
        .run(shopFields.name, shopFields.description, shopFields.address, shopFields.city, shopFields.state, shopFields.postal, shopFields.phone, shopFields.email, shopFields.services, shopImage === undefined ? (shopProfile(session.user.id)?.profile_image ?? null) : (shopImage || null), now, session.user.id)
    })()
  } catch (error: any) {
    if (String(error?.code || '').includes('UNIQUE')) return NextResponse.json({ error: 'That email address is already in use.' }, { status: 409 })
    return NextResponse.json({ error: 'Unable to save profile changes.' }, { status: 500 })
  }
  const user = db.prepare('SELECT id,name,email FROM users WHERE id=?').get(session.user.id)
  const profile = db.prepare('SELECT profile_image FROM user_profiles WHERE user_id=?').get(session.user.id) as any
  shop = shopProfile(session.user.id)
  return NextResponse.json({ role: session.role, user, profileImage: profile?.profile_image || '', shop })
}
