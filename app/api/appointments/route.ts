import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

function parseScheduledAt(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function notifyCustomer(userId: string, title: string, body: string, now: string) {
  db.prepare('INSERT INTO notifications(user_id,title,body,created_at) VALUES(?,?,?,?)')
    .run(userId, title, body, now)
}

const appointmentSelect = `
  SELECT q.id AS quote_id,q.price,q.estimate,q.timing AS quote_timing,q.warranty,q.status AS quote_status,
    r.id AS request_id,r.service,r.description,r.status AS request_status,r.timing AS requested_timing,
    r.user_id AS customer_id,u.name AS customer_name,v.year,v.make,v.model,v.trim,
    s.id AS shop_id,s.owner_user_id AS shop_owner_id,s.name AS shop_name,
    a.id AS appointment_id,a.scheduled_at,a.status AS appointment_status,a.note AS appointment_note,
    a.customer_response,a.customer_message,a.customer_updated_at,
    a.created_at AS appointment_created_at,a.updated_at AS appointment_updated_at
  FROM quotes q
  JOIN repair_requests r ON r.id=q.repair_request_id
  JOIN users u ON u.id=r.user_id
  LEFT JOIN vehicles v ON v.id=r.vehicle_id
  JOIN shop_profiles s ON s.id=q.shop_id
  LEFT JOIN appointments a ON a.quote_id=q.id
`

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'shop') return NextResponse.json({ error: 'Shop access required.' }, { status: 403 })

  const appointments = db.prepare(`${appointmentSelect}
    WHERE s.owner_user_id=? AND q.status='accepted' AND r.status='accepted'
    ORDER BY CASE WHEN a.status='scheduled' THEN 0 ELSE 1 END,
      CASE WHEN a.status='scheduled' THEN a.scheduled_at END ASC,a.scheduled_at DESC,q.updated_at DESC`)
    .all(session.user.id)
  return NextResponse.json({ appointments })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (session.role !== 'shop') return NextResponse.json({ error: 'Shop access required.' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const quoteId = Number(body.quoteId)
  const scheduledAt = parseScheduledAt(body.scheduledAt)
  const note = typeof body.note === 'string' ? body.note.trim() : ''
  if (!Number.isInteger(quoteId) || quoteId <= 0) return NextResponse.json({ error: 'A valid accepted quote is required.' }, { status: 400 })
  if (!scheduledAt || Date.parse(scheduledAt) <= Date.now()) return NextResponse.json({ error: 'Choose an appointment time in the future.' }, { status: 400 })
  if (note.length > 500) return NextResponse.json({ error: 'Appointment notes must be 500 characters or fewer.' }, { status: 400 })

  const quote = db.prepare(`${appointmentSelect}
    WHERE q.id=? AND s.owner_user_id=? AND q.status='accepted' AND r.status='accepted'`)
    .get(quoteId, session.user.id) as { quote_id: number; service: string; customer_id: string; shop_name: string; appointment_id: number | null; appointment_status: string | null } | undefined
  if (!quote) return NextResponse.json({ error: 'Accepted repair not found.' }, { status: 404 })
  if (quote.appointment_status === 'completed') return NextResponse.json({ error: 'Completed appointments cannot be rescheduled.' }, { status: 409 })

  const now = new Date().toISOString()
  const isReschedule = quote.appointment_status === 'scheduled'
  const save = db.transaction(() => {
    db.prepare(`INSERT INTO appointments(quote_id,scheduled_at,status,note,created_at,updated_at)
      VALUES(?,?,'scheduled',?,?,?)
      ON CONFLICT(quote_id) DO UPDATE SET scheduled_at=excluded.scheduled_at,status='scheduled',note=excluded.note,
        customer_response=NULL,customer_message=NULL,customer_updated_at=NULL,updated_at=excluded.updated_at`)
      .run(quoteId, scheduledAt, note || null, now, now)
    notifyCustomer(
      quote.customer_id,
      isReschedule ? 'Repair appointment updated' : 'Repair appointment scheduled',
      `${quote.shop_name} ${isReschedule ? 'updated' : 'scheduled'} your ${quote.service} appointment for ${new Date(scheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      now,
    )
    return db.prepare('SELECT * FROM appointments WHERE quote_id=?').get(quoteId)
  })()

  return NextResponse.json({ appointment: save }, { status: quote.appointment_id ? 200 : 201 })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (session.role === 'customer') {
    const quoteId = Number(body.quoteId)
    const action = body.action
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    if (!Number.isInteger(quoteId) || quoteId <= 0) return NextResponse.json({ error: 'A valid accepted quote is required.' }, { status: 400 })
    if (!['confirm', 'request_reschedule', 'request_cancellation'].includes(String(action))) {
      return NextResponse.json({ error: 'Choose a valid appointment response.' }, { status: 400 })
    }
    if (action === 'request_reschedule' && !message) {
      return NextResponse.json({ error: 'Tell the shop what days or times work better for you.' }, { status: 400 })
    }
    if (message.length > 500) return NextResponse.json({ error: 'Your message must be 500 characters or fewer.' }, { status: 400 })

    const appointment = db.prepare(`${appointmentSelect}
      WHERE q.id=? AND r.user_id=? AND q.status='accepted' AND r.status='accepted' AND a.status='scheduled'`)
      .get(quoteId, session.user.id) as {
        appointment_id: number
        service: string
        shop_name: string
        shop_owner_id: string
        customer_response: string | null
      } | undefined
    if (!appointment) return NextResponse.json({ error: 'A scheduled appointment for this repair was not found.' }, { status: 404 })
    if (action === 'confirm' && appointment.customer_response === 'confirmed') {
      return NextResponse.json({ error: 'You have already confirmed this appointment.' }, { status: 409 })
    }

    const responseStatus = action === 'confirm' ? 'confirmed' : action
    const now = new Date().toISOString()
    const transaction = db.transaction(() => {
      const updated = db.prepare(`UPDATE appointments
        SET customer_response=?,customer_message=?,customer_updated_at=?
        WHERE id=? AND status='scheduled'`)
        .run(responseStatus, message || null, now, appointment.appointment_id)
      if (!updated.changes) return false
      const title = action === 'confirm' ? 'Appointment confirmed' : action === 'request_reschedule' ? 'Customer requested a new appointment time' : 'Customer requested appointment cancellation'
      const detail = action === 'confirm'
        ? `The customer confirmed their ${appointment.service} appointment.`
        : `The customer asked about ${action === 'request_reschedule' ? 'rescheduling' : 'cancelling'} their ${appointment.service} appointment${message ? `: “${message}”` : '.'}`
      notifyCustomer(appointment.shop_owner_id, title, detail, now)
      return true
    })()
    if (!transaction) return NextResponse.json({ error: 'This appointment has already changed.' }, { status: 409 })
    return NextResponse.json({ appointment: db.prepare('SELECT * FROM appointments WHERE id=?').get(appointment.appointment_id) })
  }

  if (session.role !== 'shop') return NextResponse.json({ error: 'Shop access required.' }, { status: 403 })

  const id = Number(body.id)
  const status = String(body.status || '')
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'A valid appointment is required.' }, { status: 400 })
  if (!['completed', 'cancelled'].includes(status)) return NextResponse.json({ error: 'Choose complete or cancel for this appointment.' }, { status: 400 })

  const appointment = db.prepare(`${appointmentSelect}
    WHERE a.id=? AND s.owner_user_id=? AND q.status='accepted' AND r.status='accepted'`)
    .get(id, session.user.id) as { appointment_id: number; appointment_status: string; scheduled_at: string; service: string; customer_id: string; shop_name: string } | undefined
  if (!appointment) return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 })
  if (appointment.appointment_status !== 'scheduled') return NextResponse.json({ error: 'Only scheduled appointments can be updated.' }, { status: 409 })

  const now = new Date().toISOString()
  const result = db.transaction(() => {
    const updated = db.prepare(`UPDATE appointments
      SET status=?,customer_response=NULL,customer_message=NULL,customer_updated_at=NULL,updated_at=?
      WHERE id=? AND status='scheduled'`)
      .run(status, now, id)
    if (!updated.changes) return false
    const title = status === 'completed' ? 'Repair appointment completed' : 'Repair appointment cancelled'
    const description = status === 'completed'
      ? `${appointment.shop_name} marked your ${appointment.service} appointment as complete.`
      : `${appointment.shop_name} cancelled your ${appointment.service} appointment. Please contact the shop to arrange another time.`
    notifyCustomer(appointment.customer_id, title, description, now)
    return true
  })()
  if (!result) return NextResponse.json({ error: 'This appointment has already been updated.' }, { status: 409 })

  return NextResponse.json({ appointment: db.prepare('SELECT * FROM appointments WHERE id=?').get(id) })
}
