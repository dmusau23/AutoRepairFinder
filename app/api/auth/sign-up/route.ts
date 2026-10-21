import { NextResponse } from 'next/server'
import { createSession, createUser } from '@/lib/auth'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const role = body.role === 'shop' ? 'shop' : 'customer'
    const user = createUser(body.name ?? '', body.email ?? '', body.password ?? '', role)
    await createSession(user.id)
    return NextResponse.json({ user }, { status:201 })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to create account.' }, { status:400 }) }
}