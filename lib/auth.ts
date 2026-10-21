import crypto from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const COOKIE = 'arf_session'
const SESSION_DAYS = 7

type User = { id: string; name: string; email: string }
type Session = { user: User; role: 'customer' | 'shop' | 'admin' }

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}
function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(candidate,'hex'), Buffer.from(hash,'hex'))
}
function id() { return crypto.randomBytes(16).toString('hex') }
function now() { return new Date().toISOString() }

export function createUser(name: string, email: string, password: string, role: 'customer'|'shop') {
  if (!name.trim() || !email.trim() || password.length < 8) throw new Error('Name, email, and an 8-character password are required.')
  const normalized = email.trim().toLowerCase()
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalized)) throw new Error('An account with that email already exists.')
  const userId = id()
  const timestamp = now()
  db.prepare('INSERT INTO users (id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)')
    .run(userId, name.trim(), normalized, hashPassword(password), timestamp)
  db.prepare('INSERT INTO user_profiles (user_id,role,created_at,updated_at) VALUES (?,?,?,?)')
    .run(userId, role, timestamp, timestamp)
  if (role === 'shop') {
    db.prepare(`INSERT INTO shop_profiles (owner_user_id,name,email,services,is_verified,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)`).run(userId, `${name.trim()}'s Auto Shop`, normalized, '[]', 0, timestamp, timestamp)
  }
  return { id: userId, name: name.trim(), email: normalized, role }
}

export function authenticate(email: string, password: string) {
  const row = db.prepare('SELECT id,name,email,password_hash FROM users WHERE email = ? COLLATE NOCASE').get(email.trim().toLowerCase()) as any
  if (!row || !verifyPassword(password, row.password_hash)) throw new Error('Invalid email or password.')
  const profile = db.prepare('SELECT role FROM user_profiles WHERE user_id=?').get(row.id) as any
  return { id: row.id, name: row.name, email: row.email, role: profile?.role ?? 'customer' }
}

export async function createSession(userId: string) {
  const token = id() + id()
  const expires = new Date(Date.now() + SESSION_DAYS*86400000).toISOString()
  db.prepare('INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)').run(token,userId,expires)
  const store = await cookies()
  store.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: new Date(expires) })
}
export async function destroySession() {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(token)
  store.delete(COOKIE)
}
export async function getSession(): Promise<Session | null> {
  const store = await cookies()
  const token = store.get(COOKIE)?.value
  if (!token) return null
  const row = db.prepare(`SELECT u.id,u.name,u.email,p.role,s.expires_at
    FROM sessions s JOIN users u ON u.id=s.user_id
    LEFT JOIN user_profiles p ON p.user_id=u.id
    WHERE s.token=?`).get(token) as any
  if (!row || new Date(row.expires_at) <= new Date()) {
    db.prepare('DELETE FROM sessions WHERE token=?').run(token)
    return null
  }
  return { user: { id: row.id, name: row.name, email: row.email }, role: row.role ?? 'customer' }
}
export async function requireSession() {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
export function consumeFirstVisit(userId: string) {
  const result = db.prepare('UPDATE user_profiles SET welcome_seen_at=? WHERE user_id=? AND welcome_seen_at IS NULL')
    .run(now(), userId)
  return result.changes === 1
}
export async function requireRole(role: 'customer'|'shop'|'admin') {
  const session = await requireSession()
  if (session.role !== role) throw new Error('Forbidden')
  return session
}
export { hashPassword }
