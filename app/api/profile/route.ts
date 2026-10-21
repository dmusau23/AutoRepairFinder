import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

function shopProfile(userId:string) {
  const shop = db.prepare('SELECT * FROM shop_profiles WHERE owner_user_id=?').get(userId) as any
  if (shop) { try { shop.services = JSON.parse(shop.services || '[]') } catch { shop.services = [] } }
  return shop || null
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error:'Unauthorized' },{status:401})
  const shop = shopProfile(session.user.id)
  const profile = db.prepare('SELECT profile_image FROM user_profiles WHERE user_id=?').get(session.user.id) as any
  return NextResponse.json({ role:session.role, user:session.user, profileImage:profile?.profile_image || '', shop:shop || null })
}
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({error:'Unauthorized'},{status:401})
  const body = await request.json()
  const now = new Date().toISOString()
  const image = body.profileImage
  if (image !== undefined && image !== null && image !== '' && (typeof image !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(image) || image.length > 1_400_000)) return NextResponse.json({error:'Profile image must be a PNG, JPEG, or WebP under 1 MB.'},{status:400})
  if (image !== undefined) db.prepare('UPDATE user_profiles SET profile_image=?,updated_at=? WHERE user_id=?').run(image || null,now,session.user.id)
  if (body.name !== undefined || body.email !== undefined) {
    const name = String(body.name ?? session.user.name).trim(), email = String(body.email ?? session.user.email).trim().toLowerCase()
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({error:'Enter a valid name and email.'},{status:400})
    try {
      db.prepare('UPDATE users SET name=?,email=? WHERE id=?').run(name,email,session.user.id)
      if (session.role === 'shop') db.prepare('UPDATE shop_profiles SET email=?,updated_at=? WHERE owner_user_id=?').run(email,now,session.user.id)
    } catch { return NextResponse.json({error:'That email address is already in use.'},{status:409}) }
  }
  if (session.role === 'shop' && body.shop !== undefined) {
    const shop = body.shop || {}
    const shopImage = shop.profileImage
    if (shopImage !== undefined && shopImage !== null && shopImage !== '' && (typeof shopImage !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(shopImage) || shopImage.length > 1_400_000)) return NextResponse.json({error:'Shop image must be a PNG, JPEG, or WebP under 1 MB.'},{status:400})
    const services = Array.isArray(shop.services) ? shop.services.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,30) : String(shop.services||'').split(',').map((x:string)=>x.trim()).filter(Boolean).slice(0,30)
    db.prepare(`UPDATE shop_profiles SET name=?,description=?,address=?,city=?,state=?,postal_code=?,phone=?,email=?,services=?,profile_image=COALESCE(?,profile_image),updated_at=? WHERE owner_user_id=?`).run(String(shop.name||'').trim()||`${session.user.name}'s Auto Shop`,String(shop.description||'').trim(),String(shop.address||'').trim(),String(shop.city||'').trim(),String(shop.state||'').trim(),String(shop.postal_code||'').trim(),String(shop.phone||'').trim(),String(shop.email||session.user.email).trim(),JSON.stringify(services),shopImage === undefined ? null : shopImage || null,now,session.user.id)
  }
  const user = db.prepare('SELECT id,name,email FROM users WHERE id=?').get(session.user.id)
  const profile = db.prepare('SELECT profile_image FROM user_profiles WHERE user_id=?').get(session.user.id) as any
  const shop = shopProfile(session.user.id)
  return NextResponse.json({role:session.role,user,profileImage:profile?.profile_image||'',shop})
}
