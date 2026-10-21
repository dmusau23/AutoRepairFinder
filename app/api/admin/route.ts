import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
export async function GET(){
 const s=await getSession(); if(!s||s.role!=='admin')return NextResponse.json({error:'Admin access required.'},{status:403})
 const count=(table:string)=> (db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as any).count
 return NextResponse.json({customers:(db.prepare(`SELECT COUNT(*) as count FROM user_profiles WHERE role='customer'`).get() as any).count,shops:(db.prepare(`SELECT COUNT(*) as count FROM user_profiles WHERE role='shop'`).get() as any).count,requests:count('repair_requests'),openRequests:(db.prepare(`SELECT COUNT(*) as count FROM repair_requests WHERE status='open'`).get() as any).count,pendingQuotes:(db.prepare(`SELECT COUNT(*) as count FROM quotes WHERE status='pending'`).get() as any).count})
}