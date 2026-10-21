'use client'

import { FormEvent, useEffect, useState } from 'react'
import { CarFront, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'

type Vehicle = { id: number; year: number; make: string; model: string; trim: string | null; mileage: number | null; vin: string | null }
type Draft = { year: string; make: string; model: string; trim: string; mileage: string; vin: string }
const emptyDraft: Draft = { year: '', make: '', model: '', trim: '', mileage: '', vin: '' }

export default function VehicleManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [editingId, setEditingId] = useState<number | null>(null)
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
    setError('')
    const response = await fetch('/api/vehicles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (!response.ok) { const data = await response.json(); setError(data.error || 'Unable to remove vehicle.'); return }
    setVehicles((current) => current.filter((vehicle) => vehicle.id !== id)); setNotice('Vehicle removed.')
  }

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2">
      {loading ? <div className="rounded-xl border border-[#e4e6e1] p-6 text-sm text-[#67716f]">Loading your vehicles…</div> : vehicles.map((vehicle) => <article key={vehicle.id} className="rounded-xl border border-[#e4e6e1] p-5"><div className="flex items-start justify-between"><div className="flex size-11 items-center justify-center rounded-xl bg-[#fff0e7] text-[#e96832]"><CarFront size={21} /></div><div className="flex gap-1"><button onClick={() => startEdit(vehicle)} className="rounded-lg p-2 text-[#67716f] hover:bg-[#f2f3ef]" aria-label={`Edit ${vehicle.year} ${vehicle.make} ${vehicle.model}`}><Pencil size={16} /></button><button onClick={() => void remove(vehicle.id)} className="rounded-lg p-2 text-[#67716f] hover:bg-[#fff0e7] hover:text-[#c75324]" aria-label={`Remove ${vehicle.year} ${vehicle.make} ${vehicle.model}`}><Trash2 size={16} /></button></div></div><h3 className="mt-4 font-bold">{vehicle.year} {vehicle.make} {vehicle.model}{vehicle.trim ? ` ${vehicle.trim}` : ''}</h3><p className="mt-1 text-sm text-[#67716f]">{vehicle.mileage == null ? 'Mileage not added' : `${vehicle.mileage.toLocaleString()} miles`} · {vehicle.vin ? `VIN ${vehicle.vin}` : 'VIN not added'}</p></article>)}
      {!loading && vehicles.length === 0 && <div className="rounded-xl border border-dashed border-[#d9ddd7] p-6"><CarFront className="text-[#e96832]" /><h3 className="mt-4 font-bold">Your garage is empty</h3><p className="mt-1 text-sm text-[#67716f]">Add a vehicle to get faster, more accurate repair quotes.</p></div>}
    </div>
    <form onSubmit={save} className="rounded-xl border border-[#e4e6e1] bg-[#fbfbf9] p-5"><div className="flex items-center justify-between"><div><h3 className="font-bold">{editingId ? 'Edit vehicle' : 'Add a vehicle'}</h3><p className="mt-1 text-xs text-[#8a928e]">Required fields are marked by validation when you save.</p></div>{editingId && <button type="button" onClick={reset} className="rounded-lg p-2 text-[#67716f]" aria-label="Cancel editing"><X size={18} /></button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{([['year','Year','e.g. 2019'],['make','Make','e.g. Honda'],['model','Model','e.g. Civic'],['trim','Trim','e.g. EX'],['mileage','Mileage','e.g. 62410'],['vin','VIN','optional'] ] as const).map(([field, label, placeholder]) => <label key={field} className="text-sm font-semibold">{label}<input required={field === 'year' || field === 'make' || field === 'model'} value={draft[field]} onChange={(event) => update(field, event.target.value)} placeholder={placeholder} inputMode={field === 'year' || field === 'mileage' ? 'numeric' : 'text'} className="mt-2 h-10 w-full rounded-lg border border-[#dfe3dd] bg-white px-3 text-sm font-normal outline-none focus:border-[#e96832]" /></label>)}</div>{error && <p role="alert" className="mt-3 text-sm font-medium text-[#b42318]">{error}</p>}{notice && <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#287356]"><Check size={16} />{notice}</p>}<button disabled={saving} className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-[#e96832] px-4 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}{editingId ? 'Save changes' : 'Add vehicle'}</button></form>
  </div>
}
