import { NextResponse } from 'next/server'
import { authenticate, createSession } from '@/lib/auth'
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    const user = authenticate(email ?? '', password ?? '')
    await createSession(user.id)
    return NextResponse.json({ user, role:user.role })
  } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Unable to sign in.' }, { status: 401 }) }
}