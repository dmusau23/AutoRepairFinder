'use client'

import { useEffect, useState } from 'react'
import { Activity, BadgeDollarSign, FileText, LogOut, Moon, RefreshCw, ShieldCheck, Store, Sun, Users, Wrench } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
import { useTheme } from '@/components/theme-provider'

type AdminStats = {
  customers?: number
  shops?: number
  openRequests?: number
  pendingQuotes?: number
}

const metrics = [
  { key: 'customers', label: 'Customers', detail: 'Customer accounts', icon: Users, tone: 'mint' },
  { key: 'shops', label: 'Repair shops', detail: 'Shop accounts', icon: Store, tone: 'blue' },
  { key: 'openRequests', label: 'Open requests', detail: 'Waiting for a shop response', icon: FileText, tone: 'gold' },
  { key: 'pendingQuotes', label: 'Pending quotes', detail: 'Awaiting customer review', icon: BadgeDollarSign, tone: 'lavender' },
] as const

export default function AdminDashboard({ name }: { name: string }) {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load platform activity.')
      setData(body)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load platform activity.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function logout() {
    await signOut()
    window.location.href = '/sign-in'
  }

  return <main className="app-dashboard admin-workspace min-h-screen bg-[#f5f7f4] px-4 py-5 text-[#17232f] dark:bg-[#101a1b] dark:text-[#eef4ef] sm:px-7 sm:py-8">
    <div className="mx-auto max-w-[1180px]">
      <header className="admin-topbar flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e1e9e3] bg-white/90 p-4 shadow-sm dark:border-[#2c403c] dark:bg-[#182725] sm:px-6">
        <div className="flex items-center gap-3">
          <span className="workspace-brand-mark flex size-10 items-center justify-center rounded-[14px] bg-[#087c72] text-white"><Wrench size={19}/></span>
          <span><strong className="block text-sm">Auto Repair Finder</strong><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#82908b]">Admin workspace</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} aria-label="Toggle color theme" className="admin-icon-button">{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <button onClick={() => void load()} disabled={loading} className="admin-refresh-button"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/><span>Refresh</span></button>
          <button onClick={logout} className="admin-logout-button"><LogOut size={16}/><span>Sign out</span></button>
        </div>
      </header>

      <section className="admin-welcome-panel mt-6">
        <div className="admin-welcome-copy">
          <span className="admin-eyebrow"><ShieldCheck size={14}/> PLATFORM OVERVIEW</span>
          <h1>Good to see you, {name.split(' ')[0]}.</h1>
          <p>Monitor account growth and repair activity across Auto Repair Finder.</p>
        </div>
        <div className="admin-welcome-art" aria-hidden="true"><div className="admin-art-ring"/><span><Activity size={29}/></span></div>
      </section>

      {error && <div role="alert" className="admin-error mt-5"><p>{error}</p><button onClick={() => void load()}>Try again</button></div>}

      <section className="admin-metrics mt-5" aria-label="Platform activity">
        {metrics.map(({ key, label, detail, icon: Icon, tone }) => <article key={key} className={`admin-metric admin-tone-${tone}`}>
          <span className="admin-metric-icon"><Icon size={19}/></span>
          <span className="admin-metric-copy"><span>{label}</span><strong>{loading ? <i className="admin-value-skeleton"/> : data?.[key] ?? '—'}</strong><small>{detail}</small></span>
        </article>)}
      </section>

      <section className="admin-info-panel mt-5">
        <span className="admin-info-icon"><ShieldCheck size={20}/></span>
        <div><p className="admin-eyebrow">ABOUT THIS WORKSPACE</p><h2>One clear view of platform activity</h2><p>Counts reflect the current customer, shop, request, and quote records. App data is stored locally in SQLite.</p></div>
        <span className="admin-data-badge"><span/>{loading ? 'Updating' : error ? 'Needs attention' : 'Data loaded'}</span>
      </section>
    </div>
  </main>
}
