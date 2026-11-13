'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, CalendarCheck, CalendarClock, CalendarDays, CarFront, Check, Clock3, LoaderCircle, RotateCw, ShieldCheck, UserRound, Wrench, XCircle } from 'lucide-react'

type AppointmentRow = {
  quote_id: number
  price: number
  estimate: string | null
  warranty: string | null
  request_id: number
  service: string
  description: string | null
  requested_timing: string | null
  customer_name: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  shop_name: string
  appointment_id: number | null
  scheduled_at: string | null
  appointment_status: 'scheduled' | 'completed' | 'cancelled' | null
  appointment_note: string | null
  customer_response: 'confirmed' | 'request_reschedule' | 'request_cancellation' | null
  customer_message: string | null
  customer_updated_at: string | null
}

type View = 'Upcoming' | 'Needs scheduling' | 'Past' | 'All'

function localDateTime(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function displayDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getView(row: AppointmentRow): Exclude<View, 'All'> {
  if (!row.appointment_id || row.appointment_status === 'cancelled') return 'Needs scheduling'
  if (row.appointment_status === 'completed' || (row.scheduled_at && Date.parse(row.scheduled_at) < Date.now())) return 'Past'
  return 'Upcoming'
}

export default function ShopAppointments() {
  const [rows, setRows] = useState<AppointmentRow[]>([])
  const [view, setView] = useState<View>('Upcoming')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setLoadFailed(false)
    setError('')
    try {
      const response = await fetch('/api/appointments', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load appointments.')
      setRows(body.appointments)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load appointments.')
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const counts = useMemo(() => ({
    Upcoming: rows.filter(row => getView(row) === 'Upcoming').length,
    'Needs scheduling': rows.filter(row => getView(row) === 'Needs scheduling').length,
    Past: rows.filter(row => getView(row) === 'Past').length,
    All: rows.length,
  }), [rows])
  const visible = rows.filter(row => view === 'All' || getView(row) === view)

  function startSchedule(row: AppointmentRow) {
    setEditingId(row.quote_id)
    setDate(localDateTime(new Date(Date.now() + 60 * 60 * 1000)))
    setNote(row.appointment_note || '')
    setError('')
  }

  async function schedule(event: FormEvent<HTMLFormElement>, row: AppointmentRow) {
    event.preventDefault()
    setSavingId(row.quote_id)
    setError('')
    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: row.quote_id, scheduledAt: new Date(date).toISOString(), note }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to schedule this appointment.')
      setEditingId(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to schedule this appointment.')
    } finally {
      setSavingId(null)
    }
  }

  async function updateStatus(row: AppointmentRow, status: 'completed' | 'cancelled') {
    if (!row.appointment_id) return
    if (status === 'cancelled' && !window.confirm('Cancel this appointment? The customer will be notified.')) return
    setUpdatingId(row.appointment_id)
    setError('')
    try {
      const response = await fetch('/api/appointments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.appointment_id, status }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to update this appointment.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update this appointment.')
    } finally {
      setUpdatingId(null)
    }
  }

  return <section className="shop-appointments-panel">
    <div className="appointments-intro">
      <span className="appointments-intro-icon"><CalendarCheck size={20}/></span>
      <div><span className="appointments-kicker">REPAIR SCHEDULING</span><h2>Make the next step easy.</h2><p>Schedule accepted repairs, keep customers informed, and track what’s coming up.</p></div>
      <span className="appointments-total"><strong>{counts.Upcoming}</strong><small>upcoming</small></span>
    </div>
    <div className="appointments-summary">
      <div><span className="appointments-summary-icon upcoming"><CalendarDays size={16}/></span><span><strong>{counts.Upcoming}</strong><small>Upcoming</small></span></div>
      <div><span className="appointments-summary-icon needs"><CalendarClock size={16}/></span><span><strong>{counts['Needs scheduling']}</strong><small>Need scheduling</small></span></div>
      <div><span className="appointments-summary-icon completed"><Check size={16}/></span><span><strong>{rows.filter(row => row.appointment_status === 'completed').length}</strong><small>Completed</small></span></div>
    </div>
    <div className="appointments-toolbar">
      <div className="appointments-tabs" role="tablist" aria-label="Filter appointments">{(['Upcoming', 'Needs scheduling', 'Past', 'All'] as const).map(item=><button key={item} role="tab" aria-selected={view===item} onClick={()=>setView(item)} className={view===item?'is-active':''}>{item}<span>{counts[item]}</span></button>)}</div>
      <p>Appointments are available for accepted repair quotes.</p>
    </div>
    {error&&!loadFailed&&<div role="alert" className="appointments-error"><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss error"><XCircle size={15}/></button></div>}
    {loading ? <div className="appointments-loading"><div/><div/></div> : loadFailed ? <div role="alert" className="appointments-load-error"><span>{error}</span><button onClick={()=>void load()}><RotateCw size={14}/> Try again</button></div> : <div className="appointments-list">
      {visible.map(row=>{
        const isEditing=editingId===row.quote_id
        const isScheduled=row.appointment_status==='scheduled'
        const isCompleted=row.appointment_status==='completed'
        const vehicle=[row.year,row.make,row.model,row.trim].filter(Boolean).join(' ')
        return <article key={row.quote_id} className="appointment-card">
          <div className="appointment-card-main">
            <div className={`appointment-date-tile ${isCompleted?'is-completed':!row.appointment_id||row.appointment_status==='cancelled'?'is-unscheduled':''}`}>
              {row.scheduled_at&&row.appointment_status!=='cancelled'?<><strong>{new Date(row.scheduled_at).toLocaleDateString(undefined,{month:'short'})}</strong><span>{new Date(row.scheduled_at).getDate()}</span></>:<><CalendarDays size={19}/><small>Set a date</small></>}
            </div>
            <div className="appointment-repair-info">
              <div className="appointment-repair-heading"><h3>{row.service}</h3><span className={`appointment-status status-${row.appointment_status||'unscheduled'}`}>{row.appointment_status==='scheduled'?'Scheduled':row.appointment_status==='completed'?'Completed':row.appointment_status==='cancelled'?'Cancelled':'Needs scheduling'}</span></div>
              <p className="appointment-customer"><UserRound size={14}/>{row.customer_name}<i/> #{row.request_id} <i/> ${Number(row.price).toFixed(2)}</p>
              <div className="appointment-meta">
                {row.scheduled_at&&row.appointment_status!=='cancelled'&&<span><Clock3 size={13}/>{displayDate(row.scheduled_at)}</span>}
                <span><CarFront size={13}/>{vehicle||'Vehicle not listed'}</span>
                {row.requested_timing&&<span><Wrench size={13}/>{row.requested_timing}</span>}
              </div>
              {row.appointment_note&&row.appointment_status!=='cancelled'&&<p className="appointment-note"><ShieldCheck size={13}/>{row.appointment_note}</p>}
              {row.customer_response&&<div className={`appointment-customer-response response-${row.customer_response}`}><strong>{row.customer_response==='confirmed'?'Customer confirmed':row.customer_response==='request_reschedule'?'Reschedule requested':'Cancellation requested'}</strong>{row.customer_message&&<span>{row.customer_message}</span>}</div>}
            </div>
          </div>
          {isEditing&&<form className="appointment-schedule-form" onSubmit={event=>void schedule(event,row)}>
            <label>Appointment date and time<input required type="datetime-local" min={localDateTime(new Date())} value={date} onChange={event=>setDate(event.target.value)}/></label>
            <label>Note for the customer <span>Optional</span><textarea maxLength={500} value={note} onChange={event=>setNote(event.target.value)} placeholder="Where to check in, what to bring, or other helpful details"/></label>
            <div className="appointment-form-footer"><span>{note.length}/500 characters</span><div><button type="button" className="appointment-cancel-edit" onClick={()=>setEditingId(null)}>Cancel</button><button disabled={savingId===row.quote_id} className="appointment-save-button">{savingId===row.quote_id?<LoaderCircle className="animate-spin" size={15}/>:<CalendarCheck size={15}/>} Save appointment</button></div></div>
          </form>}
          {!isEditing&&<div className="appointment-card-actions">
            {(!row.appointment_id||row.appointment_status==='cancelled')&&<button className="appointment-primary-action" onClick={()=>startSchedule(row)}><CalendarDays size={15}/> Schedule appointment <ArrowRight size={14}/></button>}
            {isScheduled&&<><button className="appointment-secondary-action" onClick={()=>startSchedule(row)}><RotateCw size={14}/> Reschedule</button><button disabled={updatingId===row.appointment_id} className="appointment-complete-action" onClick={()=>void updateStatus(row,'completed')}>{updatingId===row.appointment_id?<LoaderCircle className="animate-spin" size={14}/>:<Check size={14}/>} Mark complete</button><button disabled={updatingId===row.appointment_id} aria-label={`Cancel ${row.service} appointment`} className="appointment-cancel-action" onClick={()=>void updateStatus(row,'cancelled')}><XCircle size={15}/></button></>}
            {isCompleted&&<span className="appointment-complete-label"><Check size={14}/> Repair marked complete</span>}
          </div>}
        </article>
      })}
      {!visible.length&&<div className="appointments-empty"><span><CalendarCheck size={23}/></span><h3>{view==='Needs scheduling'?'You’re caught up on scheduling.':view==='Past'?'No past appointments yet.':'No accepted repairs yet.'}</h3><p>{view==='Needs scheduling'?'Accepted repairs that need a date will appear here.':view==='Past'?'Completed or past appointments will be listed here.':'Once a customer accepts a quote, you can schedule their repair here.'}</p>{view!=='All'&&<button onClick={()=>setView('All')}>View all accepted repairs <ArrowRight size={14}/></button>}</div>}
    </div>}
  </section>
}
