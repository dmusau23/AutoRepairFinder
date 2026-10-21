'use client'

import { useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'

type RequestRow = Record<string, unknown>

export default function RequestManager({ requests, onChanged }: { requests: RequestRow[]; onChanged: () => void }) {
  const [editing, setEditing] = useState<RequestRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function remove(id: unknown) {
    if (!window.confirm('Delete this repair request?')) return
    setBusy(true); setError('')
    const response = await fetch('/api/requests', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (!response.ok) setError('Unable to delete this request.')
    else onChanged()
    setBusy(false)
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return
    const form = new FormData(event.currentTarget); setBusy(true); setError('')
    const response = await fetch('/api/requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, service: form.get('service'), description: form.get('description') }) })
    if (!response.ok) setError('Unable to update this request.')
    else { setEditing(null); onChanged() }
    setBusy(false)
  }

  return <div className="space-y-3">{error && <p role="alert" className="text-sm text-red-600">{error}</p>}{requests.map((request) => <article key={String(request.id)} className="rounded-xl border border-[#e4e6e1] p-4 dark:border-[#2a3834]"><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{String(request.service)}</h3><p className="mt-1 text-sm text-[#67716f] dark:text-[#b9c5bf]">{String(request.description || '')}</p><span className="mt-3 inline-block rounded-full bg-[#f2e9e2] px-2.5 py-1 text-xs font-bold text-[#c75324]">{String(request.status)}</span></div><div className="flex gap-1"><button disabled={busy} onClick={() => setEditing(request)} aria-label="Edit request" className="rounded-lg p-2 hover:bg-[#f2f3ef]"><Pencil size={16} /></button><button disabled={busy} onClick={() => void remove(request.id)} aria-label="Delete request" className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div></div></article>)}{requests.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-[#67716f]">There&apos;s nothing in the works here.</p>}{editing && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"><form onSubmit={save} className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-[#1e2a27]"><div className="flex justify-between"><h2 className="text-lg font-bold">Edit repair request</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close"><X /></button></div><label className="mt-5 block text-sm font-semibold">Service<input name="service" defaultValue={String(editing.service || '')} required className="mt-2 h-10 w-full rounded-lg border p-2 dark:border-[#2a3834] dark:bg-[#17211f]" /></label><label className="mt-4 block text-sm font-semibold">Description<textarea name="description" defaultValue={String(editing.description || '')} required className="mt-2 min-h-28 w-full rounded-lg border p-2 dark:border-[#2a3834] dark:bg-[#17211f]" /></label><button disabled={busy} className="mt-5 h-10 rounded-lg bg-[#e96832] px-4 text-sm font-bold text-white">Save changes</button></form></div>}</div>
}
