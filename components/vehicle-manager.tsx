'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, CarFront, Check, Gauge, Loader2, Pencil, Plus, ShieldCheck, Trash2, Wrench, X } from 'lucide-react'

type Vehicle = { id: number; year: number; make: string; model: string; trim: string | null; mileage: number | null; vin: string | null }
type Draft = { year: string; make: string; model: string; trim: string; mileage: string; vin: string }
const emptyDraft: Draft = { year: '', make: '', model: '', trim: '', mileage: '', vin: '' }

export default function VehicleManager({ onVehiclesChange }: { onVehiclesChange: (vehicles: Vehicle[]) => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadVehicles() {
    setLoading(true)
    try {
      const response = await fetch('/api/vehicles', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load vehicles.')
      setVehicles(data.vehicles)
      onVehiclesChange(data.vehicles)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load vehicles.') } finally { setLoading(false) }
  }
  useEffect(() => { void loadVehicles() }, [])

  function update(field: keyof Draft, value: string) { setDraft((current) => ({ ...current, [field]: value })) }
  function startEdit(vehicle: Vehicle) { setEditingId(vehicle.id); setDraft({ year: String(vehicle.year), make: vehicle.make, model: vehicle.model, trim: vehicle.trim || '', mileage: vehicle.mileage == null ? '' : String(vehicle.mileage), vin: vehicle.vin || '' }); setError(''); setNotice('') }
  function reset() { setEditingId(null); setDraft(emptyDraft); setError('') }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/vehicles', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, id: editingId, year: Number(draft.year), mileage: draft.mileage ? Number(draft.mileage) : undefined }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save vehicle.')
      setNotice(editingId ? 'Vehicle details updated.' : 'Vehicle added to your garage.')
      reset(); await loadVehicles()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save vehicle.') } finally { setSaving(false) }
  }

  async function remove(id: number) {
    if (!window.confirm('Remove this vehicle from your garage?')) return
    setError(''); setRemovingId(id)
    try {
      const response = await fetch('/api/vehicles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to remove vehicle.')
      const updated = vehicles.filter((vehicle) => vehicle.id !== id)
      setVehicles(updated); onVehiclesChange(updated); setNotice('Vehicle removed.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to remove vehicle.') }
    finally { setRemovingId(null) }
  }

  return <div className="vehicle-manager">
    <section className="garage-intro">
      <div className="garage-intro-copy"><span className="garage-kicker"><CarFront size={14}/> YOUR VEHICLE GARAGE</span><h2>Every vehicle, ready for the road.</h2><p>Keep your car details close by so repair requests are quicker and shops can give you more accurate quotes.</p></div>
      <div className="garage-art" aria-hidden="true"><span><CarFront size={33}/></span><i/><i/></div>
    </section>
    <div className="garage-summary">
      <div><span className="garage-summary-icon"><CarFront size={17}/></span><span><strong>{loading?'—':vehicles.length}</strong><small>{vehicles.length===1?'Vehicle in your garage':'Vehicles in your garage'}</small></span></div>
      <div><span className="garage-summary-icon garage-summary-service"><Wrench size={17}/></span><span><strong>{loading?'—':vehicles.filter(vehicle=>vehicle.mileage!==null).length}</strong><small>With mileage recorded</small></span></div>
      <p><ShieldCheck size={15}/> Your vehicle information is only used to support your repair requests.</p>
    </div>
    {error && <p role="alert" className="garage-alert">{error}</p>}
    {notice && <p role="status" className="garage-notice"><Check size={16}/>{notice}</p>}
    <div className="garage-section-heading"><div><span className="garage-section-kicker">YOUR GARAGE</span><h3>Vehicles</h3><p>{loading?'Loading your garage…':vehicles.length?'Manage the vehicles you use for repair requests.':'Add your first vehicle to get started.'}</p></div><span className="garage-count">{vehicles.length}</span></div>
    <div className="garage-vehicle-grid">
      {loading&&Array.from({length:2},(_,index)=><div key={index} className="garage-vehicle-skeleton"/> )}
      {!loading&&vehicles.map(vehicle=><article key={vehicle.id} className="garage-vehicle-card">
        <div className="garage-vehicle-card-top"><span className="garage-vehicle-emblem"><CarFront size={22}/></span><span className="garage-vehicle-actions"><button onClick={()=>startEdit(vehicle)} className="garage-action-button" aria-label={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`}><Pencil size={15}/></button><button disabled={removingId===vehicle.id} onClick={()=>void remove(vehicle.id)} className="garage-action-button is-destructive" aria-label={`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}`}><Trash2 size={15}/></button></span></div>
        <div className="garage-vehicle-name"><span>{vehicle.year}</span><h3>{vehicle.make} {vehicle.model}</h3>{vehicle.trim&&<p>{vehicle.trim}</p>}</div>
        <div className="garage-vehicle-details"><span><Gauge size={14}/>{vehicle.mileage==null?'Mileage not added':`${vehicle.mileage.toLocaleString()} miles`}</span><span><ShieldCheck size={14}/>{vehicle.vin?'VIN added':'VIN not added'}</span></div>
      </article>)}
      {!loading&&!vehicles.length&&<div className="garage-empty"><span><CarFront size={24}/></span><h3>Start with your first vehicle.</h3><p>Adding your year, make, and model makes it easier for shops to understand the repair you need.</p><button type="button" onClick={()=>document.getElementById('vehicle-year')?.focus()}>Add vehicle details <ArrowRight size={14}/></button></div>}
    </div>
    <form onSubmit={save} className="garage-form">
      <div className="garage-form-heading"><span className="garage-form-icon">{editingId?<Pencil size={18}/>:<Plus size={19}/>}</span><div><span className="garage-section-kicker">{editingId?'UPDATE YOUR GARAGE':'BUILD YOUR GARAGE'}</span><h3>{editingId?'Edit vehicle details':'Add a vehicle'}</h3><p>Year, make, and model are required. The rest is optional.</p></div>{editingId&&<button type="button" onClick={reset} className="garage-cancel-edit" aria-label="Cancel editing"><X size={17}/></button>}</div>
      <div className="garage-form-fields">{([['year','Year','e.g. 2019'],['make','Make','e.g. Honda'],['model','Model','e.g. Civic'],['trim','Trim','e.g. EX'],['mileage','Mileage','e.g. 62410'],['vin','VIN','Optional'] ] as const).map(([field,label,placeholder])=><label key={field} className="garage-field">{label}{field!=='year'&&field!=='make'&&field!=='model'&&<span>Optional</span>}<input id={field==='year'?'vehicle-year':undefined} required={field==='year'||field==='make'||field==='model'} value={draft[field]} onChange={event=>update(field,event.target.value)} placeholder={placeholder} inputMode={field==='year'||field==='mileage'?'numeric':'text'} className="garage-input"/></label>)}</div>
      <div className="garage-form-footer"><p>VIN and mileage can be added later.</p><button disabled={saving} className="garage-submit-button">{saving?<Loader2 className="animate-spin" size={16}/>:editingId?<Check size={16}/>:<Plus size={16} />}{saving?'Saving vehicle…':editingId?'Save changes':'Add to garage'}</button></div>
    </form>
  </div>
}
