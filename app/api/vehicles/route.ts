import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
const clean = (v:any) => typeof v === 'string' ? v.trim() : v
export async function GET() {
 const s=await getSession(); if(!s) return NextResponse.json({error:'Unauthorized'},{status:401})
 const vehicles=db.prepare('SELECT * FROM vehicles WHERE user_id=? ORDER BY created_at DESC').all(s.user.id)
 return NextResponse.json({vehicles})
}
export async function POST(request:Request){
 const s=await getSession(); if(!s)return NextResponse.json({error:'Unauthorized'},{status:401})
 const b=await request.json(); const year=Number(b.year), mileage=b.mileage==null||b.mileage===''?null:Number(b.mileage)
 if(!Number.isInteger(year)||year<1886||year>new Date().getFullYear()+1||!clean(b.make)||!clean(b.model)) return NextResponse.json({error:'Valid year, make, and model are required.'},{status:400})
 const now=new Date().toISOString(); const r=db.prepare(`INSERT INTO vehicles(user_id,year,make,model,trim,mileage,vin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)`).run(s.user.id,year,clean(b.make),clean(b.model),clean(b.trim)||null,mileage,clean(b.vin)||null,now,now)
 return NextResponse.json({vehicle:db.prepare('SELECT * FROM vehicles WHERE id=?').get(r.lastInsertRowid)},{status:201})
}
export async function PATCH(request:Request){
 const s=await getSession(); if(!s)return NextResponse.json({error:'Unauthorized'},{status:401}); const b=await request.json()
 const current=db.prepare('SELECT * FROM vehicles WHERE id=? AND user_id=?').get(Number(b.id),s.user.id) as any
 if(!current)return NextResponse.json({error:'Vehicle not found.'},{status:404})
 const year=Number(b.year), mileage=b.mileage==null||b.mileage===''?null:Number(b.mileage)
 if(!Number.isInteger(year)||!clean(b.make)||!clean(b.model))return NextResponse.json({error:'Invalid vehicle details.'},{status:400})
 db.prepare(`UPDATE vehicles SET year=?,make=?,model=?,trim=?,mileage=?,vin=?,updated_at=? WHERE id=? AND user_id=?`).run(year,clean(b.make),clean(b.model),clean(b.trim)||null,mileage,clean(b.vin)||null,new Date().toISOString(),Number(b.id),s.user.id)
 return NextResponse.json({vehicle:db.prepare('SELECT * FROM vehicles WHERE id=?').get(Number(b.id))})
}
export async function DELETE(request:Request){
 const s=await getSession(); if(!s)return NextResponse.json({error:'Unauthorized'},{status:401}); const {id}=await request.json()
 db.prepare('DELETE FROM vehicles WHERE id=? AND user_id=?').run(Number(id),s.user.id); return NextResponse.json({ok:true})
}