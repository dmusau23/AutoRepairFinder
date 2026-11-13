'use client'

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTheme } from '@/components/theme-provider'
import { signOut } from '@/lib/auth-client'
import VehicleManager from '@/components/vehicle-manager'
import SettingsPanel from '@/components/settings-panel'
import ShopAppointments from '@/components/shop-appointments'
import { ArrowRight, Bell, Bookmark, CarFront, Check, ChevronRight, CircleDollarSign, Clock3, Columns2, FileText, Home, LoaderCircle, LogOut, Mail, MapPin, Menu, Moon, Phone, Plus, Search, Settings, ShieldCheck, Star, Store, Sun, Wrench, X, CheckCircle2, XCircle, ArrowUpRight, BadgeCheck, CalendarDays, ChartNoAxesColumn, Sparkles, TrendingDown, TrendingUp, UserRound } from 'lucide-react'

type Role = 'Customer' | 'Shop'
type Row = Record<string, any>
type DashboardData = { role: string; profile: Row | null; requests: Row[]; vehicles: Row[]; quotes: Row[]; savedShops: Row[]; notifications: Row[]; shops: Row[] }
const matchesSearch = (row: Row, query: string) => !query.trim() || [row.service,row.description,row.status,row.shop_name,row.request_service,row.shop,row.name,row.city,row.state,row.postal_code,row.estimate,row.customer_name,row.year,row.make,row.model].some(value => String(value ?? '').toLowerCase().includes(query.trim().toLowerCase()))

const statusMeta: Record<string, { label: string; className: string }> = {
  open: { label: 'Waiting for quotes', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  accepted: { label: 'Repair accepted', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export default function Dashboard({ initialRole = 'Customer', userName = 'there', firstVisit = false }: { initialRole?: Role; userName?: string; firstVisit?: boolean }) {
  const { theme, toggleTheme } = useTheme()
  const [data, setData] = useState<DashboardData | null>(null)
  const [active, setActive] = useState('Overview')
  const [showRequest, setShowRequest] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showQuote, setShowQuote] = useState<Row | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<Row | null>(null)
  const [mobileNav, setMobileNav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [query, setQuery] = useState('')
  const role: Role = data?.role === 'shop' ? 'Shop' : initialRole
  const name = data?.profile?.name || userName
  const nav = role === 'Customer'
    ? ['Overview', 'My requests', 'My vehicles', 'Browse shops', 'Saved shops']
    : ['Overview', 'Repair requests', 'Manage quotes', 'Appointments']

  const sectionDetails: Record<string, { title: string; description: string }> = {
    Overview: {
      title: firstVisit ? `Welcome, ${name.split(' ')[0]}.` : `Welcome back, ${name.split(' ')[0]}.`,
      description: role === 'Customer'
        ? 'Track your repair from request to accepted quote, all in one place.'
        : 'Stay on top of incoming repair jobs, quotes, and customer decisions.',
    },
    'My requests': { title: 'My repair requests', description: 'Follow every repair, review shop responses, and compare quotes.' },
    'My vehicles': { title: 'My garage', description: 'Keep your vehicle details up to date for more accurate repair quotes.' },
    'Browse shops': { title: 'Find a repair shop', description: 'Explore local shops, compare their profiles, and save your favorites.' },
    'Saved shops': { title: 'Your saved shops', description: 'Your shortlist of trusted local repair shops.' },
    'Repair requests': { title: 'Repair marketplace', description: 'Find open repair requests and send customers a thoughtful quote.' },
    'Manage quotes': { title: 'Your quotes', description: 'Track submitted quotes and stay informed when customers respond.' },
    Appointments: { title: 'Manage appointments', description: 'Schedule accepted repairs and keep customers up to date.' },
    Settings: { title: 'Account settings', description: 'Manage your account details and public profile.' },
  }
  const section = sectionDetails[active] || sectionDetails.Overview
  const showSearch = active !== 'Settings' && active !== 'My vehicles'

  async function load() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/dashboard', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to load your workspace')
      setData(body)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load your workspace') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!mobileNav) return
    const previousOverflow = document.body.style.overflow
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileNav(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileNav])

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true); setModalError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service: form.get('service'), description: form.get('description'), vehicleId: form.get('vehicleId') ? Number(form.get('vehicleId')) : undefined, timing: form.get('timing') }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to create your repair request.')
      setShowRequest(false); await load(); setActive('My requests')
    } catch (cause) {
      setModalError(cause instanceof Error ? cause.message : 'Unable to create your repair request.')
    } finally { setSubmitting(false) }
  }

  async function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!showQuote) return
    setSubmitting(true); setModalError('')
    const form = new FormData(event.currentTarget)
    try {
      const response = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: Number(showQuote.id), price: Number(form.get('price')), estimate: form.get('estimate'), timing: form.get('timing'), warranty: form.get('warranty') }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to submit quote.')
      setShowQuote(null); await load(); setActive('Manage quotes')
    } catch (cause) {
      setModalError(cause instanceof Error ? cause.message : 'Unable to submit quote.')
    } finally { setSubmitting(false) }
  }

  async function quoteDecision(quote: Row, status: 'accepted' | 'declined') {
    try {
      const response = await fetch('/api/quotes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(quote.id), status }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to update quote.')
      setSelectedRequest(null); await load()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to update quote.') }
  }

  async function saveQuoteNote(quoteId: number, note: string) {
    try {
      const response = await fetch('/api/quote-notes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quoteId, note }) })
      if (!response.ok) return false
      setData(current => current ? { ...current, quotes: current.quotes.map(q => Number(q.id) === quoteId ? { ...q, customer_note: note } : q) } : current)
      return true
    } catch { return false }
  }

  async function cancelRequest(request: Row) {
    if (!window.confirm(`Cancel the repair request for ${request.service}?`)) return
    try {
      const response = await fetch('/api/requests', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(request.id), status: 'cancelled' }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to cancel repair request.')
      await load()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to cancel repair request.') }
  }

  async function markAllRead() {
    try {
      const response = await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to update notifications.')
      await load()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to update notifications.') }
  }

  async function saveShop(shop: Row) {
    try {
      const response = await fetch('/api/dashboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save-shop', shopId: Number(shop.id) }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Unable to save shop.')
      await load()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to save shop.') }
  }
  async function logout() { await signOut(); window.location.href = '/sign-in' }

  const unread = data?.notifications.filter(n => !n.read_at).length ?? 0
  function openRequest() { setModalError(''); setShowRequest(true) }
  function openQuote(request: Row) { setModalError(''); setShowQuote(request) }
  function syncVehicles(vehicles: Row[]) { setData(current => current ? { ...current, vehicles } : current) }
  function syncProfile(profile: { name: string; email: string; shopName?: string }) { setData(current => current ? { ...current, profile: { ...current.profile, ...profile } } : current) }

  return <div className="app-dashboard min-h-screen bg-[#f6f7f4] text-[#17232f] dark:bg-[#101715] dark:text-[#eef4ef]">
    <aside className="workspace-sidebar fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-[#e3e6e0] bg-[#fbfcfa] px-5 py-6 dark:border-[#283630] dark:bg-[#17211e] lg:flex">
      <Brand />
      <UserCard name={name} role={role} />
      {role === 'Customer' && <button onClick={openRequest} className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#e96832] px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#d95825]"><Plus size={17}/> New repair request</button>}
      <SideNav nav={nav} active={active} setActive={setActive} />
      <div className="mt-auto space-y-1 border-t border-[#e6ebe5] pt-4 dark:border-[#2a3834]"><SettingsNavButton active={active === 'Settings'} onClick={() => setActive('Settings')}/><button onClick={logout} className="workspace-utility-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#67716f] hover:bg-[#f1f3ef] dark:text-[#b9c5bf] dark:hover:bg-[#22302c]"><LogOut size={17}/> Sign out</button></div>
    </aside>

    <div className="lg:pl-[264px]">
      <header className="workspace-topbar sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#e3e6e0] bg-[#f6f7f4]/95 px-4 backdrop-blur dark:border-[#283630] dark:bg-[#101715]/95 sm:px-6 lg:px-10">
        <button className="workspace-menu-trigger mr-3 rounded-xl p-2.5 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21}/></button>
        {showSearch ? <div className="workspace-search relative flex min-w-0 max-w-lg flex-1"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa19d]" size={17}/><input aria-label="Search workspace" value={query} onChange={e=>setQuery(e.target.value)} placeholder={role === 'Customer' ? 'Search requests and shops...' : 'Search opportunities and quotes...'} className="h-11 w-full rounded-xl border border-[#dfe3dc] bg-white pl-11 pr-10 text-sm outline-none focus:border-[#e96832] dark:border-[#2a3834] dark:bg-[#1e2a27] sm:pr-10" />{query&&<button onClick={()=>setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#8a928e] hover:bg-[#f1f3ef] dark:hover:bg-[#26332f]"><X size={15}/></button>}</div> : <div className="hidden min-w-0 flex-1 sm:block"><p className="truncate text-sm font-semibold text-[#334741] dark:text-[#d9e5de]">{role} workspace</p><p className="text-xs text-[#8a928e]">A clear view of what matters</p></div>}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggleTheme} aria-label="Toggle color theme" className="flex size-10 items-center justify-center rounded-xl border border-[#e0e3de] bg-white text-[#67716f] dark:border-[#2a3834] dark:bg-[#1e2a27] dark:text-[#d9e5de]">{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <div className="relative"><button onClick={() => setShowNotifications(v => !v)} aria-label={`${unread} unread notifications`} className="relative flex size-10 items-center justify-center rounded-xl border border-transparent text-[#67716f] hover:bg-white dark:text-[#d9e5de] dark:hover:bg-[#1e2a27]"><Bell size={19}/>{unread > 0 && <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#e96832] text-[9px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}</button>{showNotifications && <NotificationPanel notifications={data?.notifications || []} onRead={markAllRead} />}</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="workspace-page-heading mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="workspace-page-eyebrow">{role} workspace <ChevronRight size={13}/>{active}</p><h1 className="mt-2 text-2xl font-bold tracking-[-0.045em] sm:text-3xl">{section.title}</h1><p className="mt-2 max-w-2xl text-sm text-[#67716f] dark:text-[#b9c5bf]">{section.description}</p></div>{active === 'Overview' && role === 'Customer' && <button onClick={openRequest} className="flex h-11 items-center gap-2 rounded-xl bg-[#e96832] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#d95825]"><Plus size={17}/> New repair request</button>}{active === 'Overview' && role === 'Shop' && <button onClick={() => setActive('Repair requests')} className="flex h-11 items-center gap-2 rounded-xl bg-[#e96832] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#d95825]"><Store size={17}/> Browse opportunities</button>}{active === 'My requests' && <button onClick={openRequest} className="flex h-11 items-center gap-2 rounded-xl bg-[#e96832] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#d95825]"><Plus size={17}/> New repair request</button>}{active === 'Saved shops' && <button onClick={() => setActive('Browse shops')} className="flex h-11 items-center gap-2 rounded-xl bg-[#087c72] px-4 text-sm font-bold text-white shadow-sm hover:bg-[#06665f]"><Store size={17}/> Browse shops</button>}</div>
        {actionError&&<div role="alert" className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><span>{actionError}</span><button onClick={()=>setActionError('')} aria-label="Dismiss message"><X size={16}/></button></div>}
        {loading ? <Loading/> : error ? <ErrorState error={error} retry={load} onRequest={openRequest} role={role}/> : <div className="workspace-section-content" key={active}><Workspace data={data!} role={role} active={active} setActive={setActive} query={query} onRequest={openRequest} onQuote={openQuote} onSaveShop={saveShop} onOpenRequest={setSelectedRequest} onQuoteDecision={quoteDecision} onCancelRequest={cancelRequest} onSaveQuoteNote={saveQuoteNote} onRefresh={load} onVehiclesChange={syncVehicles} onProfileChange={syncProfile}/></div>}
      </main>
    </div>

    {mobileNav && <div className="workspace-mobile-overlay fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileNav(false)}><aside role="dialog" aria-modal="true" aria-label="Workspace navigation" className="workspace-mobile-drawer flex h-full w-[300px] flex-col bg-[#fbfcfa] p-5 shadow-2xl dark:bg-[#17211e]" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><Brand/><button className="workspace-close-menu" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X/></button></div><UserCard name={name} role={role}/>{role === 'Customer' && <button onClick={() => {openRequest();setMobileNav(false)}} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e96832] font-bold text-white"><Plus size={17}/> New repair request</button>}<SideNav nav={nav} active={active} setActive={v => {setActive(v);setMobileNav(false)}}/><div className="mt-auto space-y-1 border-t border-[#e3e6e0] pt-4 dark:border-[#2a3834]"><SettingsNavButton active={active === 'Settings'} onClick={() => {setActive('Settings');setMobileNav(false)}}/><button onClick={logout} className="workspace-utility-link flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-[#67716f] hover:bg-[#f1f3ef] dark:text-[#b9c5bf] dark:hover:bg-[#22302c]"><LogOut size={17}/> Sign out</button></div></aside></div>}
    {showQuote && <QuoteModal request={showQuote} error={modalError} submitting={submitting} onClose={() => { setShowQuote(null); setModalError('') }} onSubmit={submitQuote}/>}
    {showRequest && <RequestModal vehicles={data?.vehicles || []} error={modalError} submitting={submitting} onClose={() => { setShowRequest(false); setModalError('') }} onSubmit={submitRequest}/>}
    {selectedRequest && <RequestDetailsModal request={selectedRequest} quotes={data?.quotes.filter(q => Number(q.repair_request_id) === Number(selectedRequest.id)) || []} onClose={() => setSelectedRequest(null)} onDecision={quoteDecision}/>}
  </div>
}

function Brand(){return <div className="workspace-brand flex items-center gap-3 px-1"><div className="workspace-brand-mark flex size-10 items-center justify-center rounded-[14px] bg-[#087c72] text-white"><Wrench size={19}/></div><div><p className="font-semibold">Auto Repair</p><p className="text-[10px] uppercase tracking-[.18em] text-[#8a928e]">Finder</p></div></div>}
function UserCard({name,role}:{name:string;role:Role}){return <div className="workspace-user-card mt-7 flex items-center gap-3 rounded-2xl border border-[#e3e6e0] bg-white p-3 dark:border-[#2a3834] dark:bg-[#1e2a27]"><span className="workspace-user-avatar">{name.trim().charAt(0).toUpperCase()||'U'}</span><span className="min-w-0"><span className="block text-[9px] font-bold uppercase tracking-[.12em] text-[#8a928e]">{role} account</span><span className="mt-1 block truncate text-sm font-bold">{name}</span></span></div>}
function SideNav({nav,active,setActive}:{nav:string[];active:string;setActive:(v:string)=>void}){return <nav className="workspace-primary-nav mt-8 space-y-1" aria-label="Main navigation"><p className="workspace-nav-label">Workspace</p>{nav.map(item=>{const Icon=item==='Overview'?Home:item==='My vehicles'?CarFront:item==='Saved shops'?Bookmark:item==='Manage quotes'?CircleDollarSign:item==='Appointments'?CalendarDays:item.toLowerCase().includes('shop')||item==='Repair requests'?Store:FileText;return <button key={item} onClick={()=>setActive(item)} aria-current={active===item?'page':undefined} className={`workspace-nav-link flex w-full items-center rounded-xl px-3 py-3 text-left text-sm transition ${active===item?'is-active':'text-[#67716f] hover:bg-[#f1f3ef] dark:text-[#b9c5bf] dark:hover:bg-[#22302c]'}`}><Icon size={18}/><span>{item}</span>{active===item&&<span className="workspace-nav-indicator"/>}</button>})}</nav>}
function SettingsNavButton({active,onClick}:{active:boolean;onClick:()=>void}){return <button onClick={onClick} aria-current={active?'page':undefined} className={`workspace-utility-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#67716f] hover:bg-[#f1f3ef] dark:text-[#b9c5bf] dark:hover:bg-[#22302c] ${active?'is-active':''}`}><Settings size={17}/> Settings</button>}
function Loading(){return <div className="animate-pulse space-y-4"><div className="h-28 rounded-2xl bg-white dark:bg-[#1e2a27]"/><div className="h-80 rounded-2xl bg-white dark:bg-[#1e2a27]"/></div>}
function ErrorState({error,retry,onRequest,role}:{error:string;retry:()=>void;onRequest:()=>void;role:Role}){return <section className="rounded-2xl border border-red-200 bg-white p-7 dark:border-red-900 dark:bg-[#1e2a27]"><h2 className="text-xl font-bold">Unable to load your workspace</h2><p className="mt-2 text-sm text-[#67716f]">{error}</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={()=>void retry()} className="rounded-xl bg-[#e96832] px-4 py-2 text-sm font-bold text-white">Try again</button>{role==='Customer'&&<button onClick={onRequest} className="rounded-xl border px-4 py-2 text-sm font-bold">Start a request</button>}</div></section>}

function Workspace({data,role,active,setActive,query,onRequest,onQuote,onSaveShop,onOpenRequest,onQuoteDecision,onCancelRequest,onSaveQuoteNote,onRefresh,onVehiclesChange,onProfileChange}:{data:DashboardData;role:Role;active:string;setActive:(v:string)=>void;query:string;onRequest:()=>void;onQuote:(r:Row)=>void;onSaveShop:(s:Row)=>void;onOpenRequest:(r:Row)=>void;onQuoteDecision:(q:Row,status:'accepted'|'declined')=>void;onCancelRequest:(r:Row)=>void;onSaveQuoteNote:(id:number,note:string)=>Promise<boolean>;onRefresh:()=>Promise<void>;onVehiclesChange:(vehicles:Row[])=>void;onProfileChange:(profile:{name:string;email:string;shopName?:string})=>void}){
  if(active==='My vehicles') return <VehicleManager onVehiclesChange={onVehiclesChange}/>
  if(active==='My requests') return <CustomerRequests requests={data.requests.filter(r=>matchesSearch(r,query))} quotes={data.quotes} query={query} onRequest={onRequest} onOpen={onOpenRequest} onDecision={onQuoteDecision} onCancel={onCancelRequest} onSaveQuoteNote={onSaveQuoteNote} onRefresh={onRefresh}/>
  if(active==='Overview') return role==='Customer' ? <CustomerOverview data={data} query={query} onRequest={onRequest} setActive={setActive} onOpen={onOpenRequest} onDecision={onQuoteDecision} onCancel={onCancelRequest} onSaveQuoteNote={onSaveQuoteNote} onRefresh={onRefresh}/> : <ShopOverview data={data} query={query} setActive={setActive} onQuote={onQuote}/>
  if(active==='Settings') return <SettingsPanel onProfileChange={onProfileChange}/>
  if(active==='Submit a quote' && role==='Shop') return <ShopRequests requests={data.requests.filter(r=>r.status==='open'&&!data.quotes.some(q=>Number(q.repair_request_id)===Number(r.id))&&matchesSearch(r,query))} onQuote={onQuote}/>
  if(active==='Repair requests' && role==='Shop') return <ShopRequests requests={data.requests.filter(r=>r.status==='open'&&!data.quotes.some(q=>Number(q.repair_request_id)===Number(r.id))&&matchesSearch(r,query))} onQuote={onQuote}/>
  if(active==='Manage quotes' && role==='Shop') return <ShopQuotes quotes={data.quotes.filter(q=>matchesSearch(q,query))} setActive={setActive}/>
  if(active==='Appointments' && role==='Shop') return <ShopAppointments/>
  if(active==='Browse shops') return <ShopDirectory shops={data.shops} saved={data.savedShops} query={query} onSave={onSaveShop}/>
  if(active==='Saved shops') return <SavedShops shops={data.savedShops.filter(s=>matchesSearch(s,query))} profiles={data.shops} onBrowse={()=>setActive('Browse shops')}/>
  return <section className="rounded-2xl border bg-white p-7 dark:border-[#2a3834] dark:bg-[#1e2a27]"><h2 className="text-xl font-bold">{active}</h2><p className="mt-2 text-sm text-[#67716f]">Nothing to display yet.</p></section>
}

function CustomerOverview({data,query,onRequest,setActive,onOpen,onDecision,onCancel,onSaveQuoteNote,onRefresh}:{data:DashboardData;query:string;onRequest:()=>void;setActive:(v:string)=>void;onOpen:(r:Row)=>void;onDecision:(q:Row,s:'accepted'|'declined')=>void;onCancel:(r:Row)=>void;onSaveQuoteNote:(id:number,note:string)=>Promise<boolean>;onRefresh:()=>Promise<void>}){
  const activeRequests=data.requests.filter(r=>r.status==='open'), accepted=data.requests.filter(r=>r.status==='accepted').length
  const pendingQuotes=data.quotes.filter(q=>q.status==='pending')
  const visibleRequests=data.requests.filter(r=>matchesSearch(r,query)).slice(0,3)
  const visiblePending=pendingQuotes.filter(q=>matchesSearch(q,query)).slice(0,3)
  const vehicle=data.vehicles[0]
  return <div className="workspace-overview space-y-6">
    <section className="workspace-hero customer-hero">
      <div className="workspace-hero-copy"><span className="workspace-hero-kicker"><Sparkles size={14}/> YOUR REPAIR, YOUR WAY</span><h2>One less thing<br className="hidden sm:block"/> to worry about.</h2><p>Keep your car care organized, compare quotes clearly, and make the call that feels right.</p><div className="workspace-hero-actions"><button onClick={onRequest}><Plus size={17}/> Start a repair request</button><button className="workspace-hero-link" onClick={()=>setActive('Browse shops')}>Explore local shops <ArrowRight size={15}/></button></div></div>
      <div className="customer-hero-art" aria-hidden="true"><div className="hero-orbit hero-orbit-one"/><div className="hero-orbit hero-orbit-two"/><div className="hero-car-disc"><CarFront size={74} strokeWidth={1.2}/></div><span className="hero-art-pill hero-art-pill-top"><ShieldCheck size={14}/> In good hands</span><span className="hero-art-pill hero-art-pill-bottom"><CheckCircle2 size={14}/> Your choice, always</span></div>
      <div className="workspace-hero-foot"><span><strong>{activeRequests.length}</strong> active {activeRequests.length===1?'request':'requests'}</span><i/><span><strong>{pendingQuotes.length}</strong> {pendingQuotes.length===1?'quote':'quotes'} to review</span><i/><span><strong>{data.vehicles.length}</strong> {data.vehicles.length===1?'vehicle':'vehicles'} in your garage</span></div>
    </section>
    <section className="overview-metrics" aria-label="Repair overview">
      <OverviewMetric label="Active requests" value={activeRequests.length} icon={Wrench} detail="Waiting on local shops" tone="mint"/>
      <OverviewMetric label="Quotes to review" value={pendingQuotes.length} icon={CircleDollarSign} detail={pendingQuotes.length?'Compare your options':'You’re all caught up'} tone="gold"/>
      <OverviewMetric label="Your vehicles" value={data.vehicles.length} icon={CarFront} detail={vehicle?[vehicle.year,vehicle.make,vehicle.model].filter(Boolean).join(' '):'Add your first vehicle'} tone="blue"/>
      <OverviewMetric label="Accepted repairs" value={accepted} icon={CheckCircle2} detail="Ready for the next step" tone="lavender"/>
    </section>
    <section className="overview-content-grid customer-content-grid">
      <div className="workspace-panel">
        <div className="workspace-panel-heading"><div><span className="workspace-panel-kicker">YOUR GARAGE</span><h3>Repair activity</h3><p>Every request, from first quote to final decision.</p></div><button className="workspace-text-link" onClick={()=>setActive('My requests')}>View all <ArrowUpRight size={15}/></button></div>
        <div className="request-activity-list">{visibleRequests.map(request=><RequestProgress key={request.id} request={request} quotes={data.quotes.filter(q=>Number(q.repair_request_id)===Number(request.id))} onOpen={onOpen} onDecision={onDecision} onCancel={onCancel} onSaveQuoteNote={onSaveQuoteNote} onRefresh={onRefresh}/>)}{!visibleRequests.length&&<Empty title={query?'No matching requests':'Your repair journey starts here'} description={query?'Try a different search or clear it to see all requests.':'Post a request and local shops can send you quotes to compare.'} actionLabel={!query?'Create your first request':undefined} onAction={!query?onRequest:undefined}/>}</div>
      </div>
      <div className="workspace-side-stack">
        <div className="workspace-panel quote-inbox-panel"><div className="workspace-panel-heading"><div><span className="workspace-panel-kicker">A DECISION, MADE EASIER</span><h3>Quotes for you</h3></div><span className="panel-count">{pendingQuotes.length}</span></div><p className="workspace-panel-description">Review pricing, timing, and warranty details before you choose.</p>
          <div className="quote-inbox-list">{visiblePending.map(quote=><QuoteDecisionCard key={quote.id} quote={quote} onDecision={onDecision}/>)}{!visiblePending.length&&<div className="inbox-empty"><span className="inbox-empty-icon"><Check size={19}/></span><strong>{query?'No matching quotes':'All caught up'}</strong><p>{query?'Try another search to find quotes.':'New shop quotes will appear here when they’re ready.'}</p></div>}</div>
          {pendingQuotes.length>3&&<button className="workspace-outline-link" onClick={()=>setActive('My requests')}>See all {pendingQuotes.length} quotes <ArrowRight size={15}/></button>}
        </div>
        <div className="workspace-tip-card"><span className="workspace-tip-icon"><ShieldCheck size={19}/></span><div><span>THE CONFIDENT CHOICE</span><strong>Good repairs start with clear details.</strong><p>Compare the estimate, timing, and warranty—not just the price.</p></div></div>
      </div>
    </section>
  </div>
}

function ShopOverview({data,query,setActive,onQuote}:{data:DashboardData;query:string;setActive:(v:string)=>void;onQuote:(r:Row)=>void}){
  const open=data.requests.filter(r=>r.status==='open'&&!data.quotes.some(q=>Number(q.repair_request_id)===Number(r.id)))
  const acceptedQuotes=data.quotes.filter(q=>q.status==='accepted'), pending=data.quotes.filter(q=>q.status==='pending'), declined=data.quotes.filter(q=>q.status==='declined')
  const acceptedValue=acceptedQuotes.reduce((sum,q)=>sum+Number(q.price||0),0)
  const visibleOpen=open.filter(r=>matchesSearch(r,query)).slice(0,4)
  const shopName=data.profile?.shopName||'Your shop'
  return <div className="workspace-overview space-y-6">
    <section className="workspace-hero shop-hero">
      <div className="workspace-hero-copy"><span className="workspace-hero-kicker"><span className="shop-live-dot"/> SHOP WORKSPACE</span><h2>Good work starts<br className="hidden sm:block"/> with the next job.</h2><p>Welcome to your shop floor, {shopName}. Find the right repair requests and send clear, confident quotes.</p><div className="workspace-hero-actions"><button onClick={()=>setActive('Repair requests')}><Search size={16}/> Explore repair requests</button><button className="workspace-hero-link" onClick={()=>setActive('Manage quotes')}>Manage your quotes <ArrowRight size={15}/></button></div></div>
      <div className="shop-hero-art" aria-hidden="true"><div className="shop-hero-ring shop-hero-ring-one"/><div className="shop-hero-ring shop-hero-ring-two"/><div className="shop-hero-emblem"><Store size={42} strokeWidth={1.35}/><span><BadgeCheck size={15}/></span></div><div className="shop-hero-stat"><TrendingUp size={15}/><span><strong>{data.quotes.length}</strong><small>quotes sent</small></span></div></div>
      <div className="workspace-hero-foot"><span><strong>{open.length}</strong> new {open.length===1?'opportunity':'opportunities'}</span><i/><span><strong>{pending.length}</strong> quotes awaiting a reply</span><i/><span><strong>{acceptedQuotes.length}</strong> accepted {acceptedQuotes.length===1?'repair':'repairs'}</span></div>
    </section>
    <section className="overview-metrics" aria-label="Shop performance">
      <OverviewMetric label="New opportunities" value={open.length} icon={Wrench} detail="Requests you haven’t quoted" tone="mint"/>
      <OverviewMetric label="Quotes in play" value={data.quotes.length} icon={FileText} detail={`${pending.length} awaiting a reply`} tone="blue"/>
      <OverviewMetric label="Accepted quote value" value={`$${acceptedValue.toLocaleString('en-US',{maximumFractionDigits:2})}`} icon={CircleDollarSign} detail={`${acceptedQuotes.length} accepted ${acceptedQuotes.length===1?'repair':'repairs'}`} tone="gold"/>
      <OverviewMetric label="Average quote" value={data.quotes.length?`$${(data.quotes.reduce((sum,q)=>sum+Number(q.price||0),0)/data.quotes.length).toLocaleString('en-US',{maximumFractionDigits:2})}`:'—'} icon={TrendingUp} detail="Across your submitted quotes" tone="lavender"/>
    </section>
    <section className="overview-content-grid shop-content-grid">
      <div className="workspace-panel">
        <div className="workspace-panel-heading"><div><span className="workspace-panel-kicker">THE MARKETPLACE</span><h3>Fresh opportunities</h3><p>Local customers looking for reliable repair work.</p></div><button className="workspace-text-link" onClick={()=>setActive('Repair requests')}>Browse all <ArrowUpRight size={15}/></button></div>
        <div className="shop-opportunity-list">{visibleOpen.map(request=><ShopJobCard key={request.id} request={request} onQuote={onQuote}/>)}{!visibleOpen.length&&<div className="inbox-empty shop-empty">{query?'No matching requests found.':'No new requests right now.'}<p>{query?'Try another search to find opportunities.':'New local repair requests will show up here as they arrive.'}</p>{!query&&<button className="workspace-outline-link" onClick={()=>setActive('Manage quotes')}>Review sent quotes <ArrowRight size={15}/></button>}</div>}</div>
      </div>
      <div className="workspace-side-stack">
        <div className="workspace-panel shop-pipeline-panel"><div className="workspace-panel-heading"><div><span className="workspace-panel-kicker">YOUR PIPELINE</span><h3>Quote activity</h3></div><button className="panel-count-button" onClick={()=>setActive('Manage quotes')} aria-label="Manage quotes"><ArrowUpRight size={15}/></button></div>
          <div className="pipeline-visual"><div className="pipeline-visual-top"><span>Quote outcomes</span><strong>{data.quotes.length}</strong></div><div className="pipeline-bar"><span className="pipeline-segment-accepted" style={{width:`${data.quotes.length?acceptedQuotes.length/data.quotes.length*100:0}%`}}/><span className="pipeline-segment-pending" style={{width:`${data.quotes.length?pending.length/data.quotes.length*100:0}%`}}/><span className="pipeline-segment-declined" style={{width:`${data.quotes.length?declined.length/data.quotes.length*100:0}%`}}/></div><div className="pipeline-legend"><span><i className="pipeline-accepted"/> {acceptedQuotes.length} accepted</span><span><i className="pipeline-pending"/> {pending.length} awaiting</span><span><i className="pipeline-declined"/> {declined.length} declined</span></div></div>
          <div className="pipeline-list"><Stat label="New opportunities" value={open.length}/><Stat label="Waiting on customer" value={pending.length}/><Stat label="Accepted" value={acceptedQuotes.length}/></div>
        </div>
        <div className="workspace-tip-card shop-tip-card"><span className="workspace-tip-icon"><ShieldCheck size={19}/></span><div><span>THE DETAILS MAKE THE DIFFERENCE</span><strong>Clear quotes earn confidence.</strong><p>Add a useful estimate, realistic timing, and warranty details to every quote.</p></div></div>
      </div>
    </section>
  </div>
}

function OverviewMetric({label,value,icon:Icon,detail,tone}:{label:string;value:string|number;icon:typeof Wrench;detail:string;tone:'mint'|'gold'|'blue'|'lavender'}){return <article className="overview-metric"><span className={`overview-metric-icon tone-${tone}`}><Icon size={18}/></span><span className="overview-metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>}
function Stat({label,value}:{label:string;value:any}){return <div className="flex items-center justify-between border-b border-[#edf0eb] pb-3 last:border-0 dark:border-[#2a3834]"><span className="text-sm text-[#67716f] dark:text-[#b9c5bf]">{label}</span><strong>{value}</strong></div>}

function formatMilestoneDate(value?:string|null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})
}

function downloadAppointmentInvite(quote:Row) {
  if (!quote.appointment_scheduled_at) return
  const start = new Date(quote.appointment_scheduled_at)
  if (Number.isNaN(start.getTime())) return
  const end = new Date(start.getTime()+60*60*1000)
  const toCalendarDate = (date:Date) => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')
  const escape = (value:string) => value.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')
  const details = [quote.shop_name,quote.shop_phone,quote.shop_email].filter(Boolean).join(' · ')
  const content = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Auto Repair Finder//Appointment//EN','BEGIN:VEVENT',
    `UID:repair-${quote.id}@autorepairfinder.local`,`DTSTAMP:${toCalendarDate(new Date())}`,
    `DTSTART:${toCalendarDate(start)}`,`DTEND:${toCalendarDate(end)}`,
    `SUMMARY:${escape(`${quote.request_service||'Vehicle repair'} at ${quote.shop_name||'repair shop'}`)}`,
    `DESCRIPTION:${escape(details)}`,'END:VEVENT','END:VCALENDAR',
  ].join('\r\n')
  const url=URL.createObjectURL(new Blob([content],{type:'text/calendar;charset=utf-8'}))
  const link=document.createElement('a')
  link.href=url
  link.download='repair-appointment.ics'
  link.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

function RequestProgress({request,quotes,onOpen,onDecision,onCancel,onSaveQuoteNote,onRefresh}:{request:Row;quotes:Row[];onOpen:(r:Row)=>void;onDecision:(q:Row,s:'accepted'|'declined')=>void;onCancel?:(r:Row)=>void;onSaveQuoteNote?:(id:number,note:string)=>Promise<boolean>;onRefresh:()=>Promise<void>}){
  const [compareOpen,setCompareOpen]=useState(false)
  const [appointmentForm,setAppointmentForm]=useState<'request_reschedule'|'request_cancellation'|null>(null)
  const [appointmentMessage,setAppointmentMessage]=useState('')
  const [appointmentSaving,setAppointmentSaving]=useState(false)
  const [appointmentError,setAppointmentError]=useState('')
  const pending=quotes.filter(q=>q.status==='pending')
  const accepted=quotes.find(q=>q.status==='accepted')
  const scheduled=accepted?.appointment_status==='scheduled'
  const completed=accepted?.appointment_status==='completed'
  const milestones=request.status==='cancelled' ? [
    {label:'Request posted',detail:formatMilestoneDate(request.created_at)||'Your repair request was posted.',state:'complete'},
    {label:'Request cancelled',detail:'This repair request is no longer active.',state:'complete'},
  ] : [
    {label:'Request posted',detail:formatMilestoneDate(request.created_at)||'Your repair request is live.',state:'complete'},
    {label:'Quotes received',detail:quotes.length?`${quotes.length} ${quotes.length===1?'shop has':'shops have'} responded${formatMilestoneDate(quotes.map(q=>q.created_at).filter(Boolean).sort()[0])?` · ${formatMilestoneDate(quotes.map(q=>q.created_at).filter(Boolean).sort()[0])}`:''}`:'Waiting for local shops to respond.',state:quotes.length?'complete':'current'},
    {label:'Quote accepted',detail:accepted?`${accepted.shop_name} · ${formatMilestoneDate(accepted.updated_at)||`$${Number(accepted.price).toFixed(2)}`}`:'Compare quotes and choose the right fit.',state:accepted?'complete':quotes.length?'current':'upcoming'},
    {label:'Appointment',detail:completed?'Repair marked complete.':scheduled?formatMilestoneDate(accepted.appointment_scheduled_at)||'Appointment scheduled.':accepted?.appointment_status==='cancelled'?'Appointment cancelled. Contact the shop to arrange another time.':accepted?'Your shop will schedule a time with you.':'Available after you accept a quote.',state:completed?'complete':scheduled?'complete':accepted?'current':'upcoming'},
  ]
  if(completed&&!request.status?.includes('cancelled')) milestones.push({label:'Repair complete',detail:formatMilestoneDate(accepted.appointment_updated_at)||'Your shop marked this repair complete.',state:'complete'})

  async function submitAppointmentResponse(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!accepted||!appointmentForm)return
    setAppointmentSaving(true)
    setAppointmentError('')
    try {
      const response=await fetch('/api/appointments',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({quoteId:Number(accepted.id),action:appointmentForm,message:appointmentMessage})})
      const body=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(body.error||'Unable to send your appointment request.')
      setAppointmentForm(null)
      setAppointmentMessage('')
      await onRefresh()
    } catch(cause) {
      setAppointmentError(cause instanceof Error?cause.message:'Unable to send your appointment request.')
    } finally {
      setAppointmentSaving(false)
    }
  }

  return <div className="activity-request-card mt-5 rounded-xl border border-[#e3e6e0] p-4 dark:border-[#2a3834]">
    <div className="flex items-start justify-between gap-3"><div><button onClick={()=>onOpen(request)} className="text-left font-bold hover:text-[#c75324]">{request.service}</button><p className="mt-1 text-xs text-[#8a928e]">#{request.id} · {formatMilestoneDate(request.created_at)||'Date unavailable'}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${statusMeta[request.status]?.className||statusMeta.open.className}`}>{statusMeta[request.status]?.label||request.status}</span></div>
    <ol className="repair-timeline" aria-label="Repair progress">{milestones.map((milestone,index)=><li key={milestone.label} className={`repair-timeline-step is-${milestone.state}`}><span className="repair-timeline-marker">{milestone.state==='complete'?<Check size={13}/>:<span/>}</span><div><strong>{milestone.label}</strong><small>{milestone.detail}</small></div>{index<milestones.length-1&&<span className="repair-timeline-connector"/>}</li>)}</ol>
    {pending.length>0&&<div className="mt-4 space-y-2">{pending.slice(0,2).map(q=><QuoteDecisionCard key={q.id} quote={q} onDecision={onDecision}/>)}</div>}
    {accepted&&<div className={`customer-appointment-panel ${accepted.appointment_status==='cancelled'?'is-cancelled':completed?'is-completed':''}`}>
      <div className="customer-appointment-heading"><span className="customer-appointment-icon"><CalendarDays size={17}/></span><div><strong>{scheduled?'Your appointment':completed?'Repair complete':accepted.appointment_status==='cancelled'?'Appointment cancelled':'Next up: schedule your repair'}</strong><small>{scheduled&&accepted.appointment_scheduled_at?new Date(accepted.appointment_scheduled_at).toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}):completed?'Your shop marked this repair complete.':accepted.appointment_status==='cancelled'?'Reach out to arrange another time.':'The shop will contact you to coordinate a time.'}</small></div></div>
      {scheduled&&accepted.customer_response&&<p className="customer-appointment-response">{accepted.customer_response==='confirmed'?'You confirmed this appointment.':accepted.customer_response==='request_reschedule'?'Your request to reschedule has been sent to the shop.':'Your request to cancel has been sent to the shop.'}{accepted.customer_message?` “${accepted.customer_message}”`:''}</p>}
      {scheduled&&accepted.customer_response?.startsWith('request_')&&<p className="customer-appointment-help">The appointment remains scheduled until the shop confirms a change.</p>}
      {scheduled&&!appointmentForm&&<div className="customer-appointment-actions">
        {!accepted.customer_response&&<button className="customer-appointment-confirm" onClick={async()=>{setAppointmentSaving(true);setAppointmentError('');try{const response=await fetch('/api/appointments',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({quoteId:Number(accepted.id),action:'confirm'})});const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||'Unable to confirm this appointment.');await onRefresh()}catch(cause){setAppointmentError(cause instanceof Error?cause.message:'Unable to confirm this appointment.')}finally{setAppointmentSaving(false)}}} disabled={appointmentSaving}>{appointmentSaving?<LoaderCircle size={14} className="animate-spin"/>:<Check size={14}/>} Confirm appointment</button>}
        {accepted.customer_response!=='request_reschedule'&&<button className="customer-appointment-secondary" onClick={()=>{setAppointmentForm('request_reschedule');setAppointmentMessage('');setAppointmentError('')}}>Request a new time</button>}
        {accepted.customer_response!=='request_cancellation'&&<button className="customer-appointment-secondary" onClick={()=>{setAppointmentForm('request_cancellation');setAppointmentMessage('');setAppointmentError('')}}>Request cancellation</button>}
        {accepted.shop_phone&&<a href={`tel:${accepted.shop_phone}`} className="customer-appointment-contact"><Phone size={14}/> Call shop</a>}
        {accepted.shop_email&&<a href={`mailto:${accepted.shop_email}`} className="customer-appointment-contact"><Mail size={14}/> Email shop</a>}
        <button className="customer-appointment-secondary" onClick={()=>downloadAppointmentInvite(accepted)}><CalendarDays size={14}/> Add to calendar</button>
      </div>}
      {appointmentForm&&<form className="customer-appointment-form" onSubmit={event=>void submitAppointmentResponse(event)}><label>{appointmentForm==='request_reschedule'?'What time works better for you?':'Tell the shop why you need to cancel'}<textarea maxLength={500} value={appointmentMessage} onChange={event=>setAppointmentMessage(event.target.value)} placeholder={appointmentForm==='request_reschedule'?'Share a few days or times that work…':'Add a note for the shop (optional)'} required={appointmentForm==='request_reschedule'}/></label><div><span>{appointmentMessage.length}/500 · The shop will be notified.</span><button type="button" onClick={()=>setAppointmentForm(null)}>Keep appointment</button><button type="submit" disabled={appointmentSaving}>{appointmentSaving?<LoaderCircle size={14} className="animate-spin"/>:<ArrowRight size={14}/>} Send request</button></div></form>}
      {appointmentError&&<p role="alert" className="customer-appointment-error">{appointmentError}</p>}
    </div>}
    {quotes.length>0&&<button onClick={()=>setCompareOpen(true)} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#dfe3dc] px-3 py-2 text-xs font-bold text-[#c75324] hover:bg-[#fff8f4] dark:border-[#34423d] dark:hover:bg-[#26332f]"><Columns2 size={15}/>{quotes.length>1?`Compare ${quotes.length} quotes`:'Review quote'}</button>}
    {request.status==='open'&&onCancel&&<button onClick={()=>onCancel(request)} className="mt-4 ml-2 inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"><XCircle size={15}/>Cancel request</button>}
    {compareOpen&&<QuoteComparisonModal quotes={quotes} onClose={()=>setCompareOpen(false)} onSaveNote={onSaveQuoteNote}/>}
  </div>
}
function QuoteDecisionCard({quote,onDecision}:{quote:Row;onDecision:(q:Row,s:'accepted'|'declined')=>void}){return <div className="quote-decision-card rounded-xl border border-[#e3e6e0] bg-white p-4 dark:border-[#2a3834] dark:bg-[#1b2522]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{quote.shop_name}</p><p className="mt-1 text-xs text-[#67716f]">{quote.timing||'Timing not specified'} · {quote.warranty||'Warranty not specified'}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><span className="text-lg font-bold text-[#c75324]">${Number(quote.price).toFixed(2)}</span><button onClick={()=>onDecision(quote,'declined')} aria-label="Decline quote" className="rounded-lg border p-2 text-[#67716f] hover:border-red-200 hover:text-red-600"><XCircle size={18}/></button><button onClick={()=>onDecision(quote,'accepted')} aria-label="Accept quote" className="rounded-lg bg-[#e96832] p-2 text-white hover:bg-[#d95825]"><CheckCircle2 size={18}/></button></div></div></div>}
function quotePriceInsight(price:number,average:number,count:number){if(count<2||average<=0)return 'Only quote received';const difference=(price-average)/average;if(difference<-.1)return `${Math.abs(difference*100).toFixed(0)}% below average`;if(difference>.1)return `${(difference*100).toFixed(0)}% above average`;return 'Near this request’s average'}
function QuoteComparisonModal({quotes,onClose,onSaveNote}:{quotes:Row[];onClose:()=>void;onSaveNote?: (id:number,note:string)=>Promise<boolean>}){
  const [notes,setNotes]=useState<Record<number,string>>(()=>Object.fromEntries(quotes.map(q=>[Number(q.id),q.customer_note||''])))
  const [saving,setSaving]=useState<number|null>(null),[saved,setSaved]=useState<number|null>(null),[saveError,setSaveError]=useState<number|null>(null)
  const dialogRef=useRef<HTMLElement>(null)
  const closeRef=useRef<HTMLButtonElement>(null)
  const onCloseRef=useRef(onClose)
  onCloseRef.current=onClose
  const sortedQuotes=[...quotes].sort((a,b)=>Number(a.price)-Number(b.price))
  const prices=quotes.map(q=>Number(q.price)).filter(Number.isFinite)
  const average=prices.reduce((total,price)=>total+price,0)/Math.max(prices.length,1)
  const lowestPrice=prices.length?Math.min(...prices):null
  useEffect(()=>{
    const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    closeRef.current?.focus()
    function onKeyDown(event:KeyboardEvent){
      if(event.key==='Escape'){event.preventDefault();onCloseRef.current();return}
      if(event.key!=='Tab'||!dialogRef.current)return
      const focusable=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'))
      if(!focusable.length)return
      const first=focusable[0],last=focusable[focusable.length-1]
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
    document.addEventListener('keydown',onKeyDown)
    return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',onKeyDown);previousFocus?.focus()}
  },[])
  async function saveNote(quoteId:number){if(!onSaveNote)return;setSaving(quoteId);setSaved(null);setSaveError(null);try{if(await onSaveNote(quoteId,notes[quoteId]||''))setSaved(quoteId);else setSaveError(quoteId)}catch{setSaveError(quoteId)}finally{setSaving(null)}}
  return <div className="quote-compare-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="quote-comparison-title" aria-describedby="quote-comparison-description" className="quote-compare-dialog" onMouseDown={event=>event.stopPropagation()}>
      <header className="quote-compare-header">
        <div className="quote-compare-heading"><span className="quote-compare-icon"><Columns2 size={18}/></span><div><span className="quote-compare-kicker">YOUR REPAIR OPTIONS</span><h2 id="quote-comparison-title">Compare shop quotes</h2><p id="quote-comparison-description">Look beyond price to find the right fit for your repair.</p></div></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close quote comparison" className="quote-compare-close"><X size={19}/></button>
      </header>
      <div className="quote-compare-content">
        <div className="quote-compare-summary">
          <div><span className="quote-compare-summary-icon"><CircleDollarSign size={16}/></span><span><small>Quotes received</small><strong>{quotes.length}</strong></span></div>
          {lowestPrice!==null&&<div><span className="quote-compare-summary-icon lowest"><TrendingDown size={16}/></span><span><small>Lowest quote</small><strong>${lowestPrice.toFixed(2)}</strong></span></div>}
          {prices.length>1&&<div><span className="quote-compare-summary-icon average"><ChartNoAxesColumn size={16}/></span><span><small>Request average</small><strong>${average.toFixed(2)}</strong></span></div>}
        </div>
        <p className="quote-compare-disclaimer">Price benchmarks are calculated only from quotes for this repair. They are not an independent market estimate.</p>
        <div className="quote-compare-grid">{sortedQuotes.map(q=>{
          const price=Number(q.price)
          const isLowest=lowestPrice!==null&&price===lowestPrice
          const status=String(q.status||'pending')
          const noteText=notes[Number(q.id)]||''
          return <article key={q.id} className={`quote-compare-card ${isLowest?'is-lowest':''}`}>
            <div className="quote-compare-card-top"><span className="quote-compare-shop-mark">{String(q.shop_name||'R').trim().charAt(0).toUpperCase()}</span><div className="quote-compare-shop"><h3>{q.shop_name||'Repair shop'}</h3><span><Star size={13}/>{Number(q.rating||0).toFixed(1)} rating{Number(q.review_count)>0?` · ${q.review_count} reviews`:''}</span></div><span className={`quote-compare-status status-${status}`}>{status==='pending'?'Awaiting reply':status==='accepted'?'Accepted':'Not selected'}</span></div>
            <div className="quote-compare-price"><span>Quoted total</span><strong>${Number.isFinite(price)?price.toFixed(2):'—'}</strong><small>{quotePriceInsight(price,average,prices.length)}</small>{isLowest&&<span className="quote-compare-lowest"><Check size={12}/> Lowest price</span>}</div>
            <dl className="quote-compare-details">
              <div><dt><Wrench size={14}/> Estimate</dt><dd>{q.estimate||'Details not provided'}</dd></div>
              <div><dt><Clock3 size={14}/> Timing</dt><dd>{q.timing||'Not specified'}</dd></div>
              <div><dt><ShieldCheck size={14}/> Warranty</dt><dd>{q.warranty||'Not specified'}</dd></div>
            </dl>
            <div className="quote-compare-note">
              <div className="quote-compare-note-heading"><label htmlFor={`quote-note-${q.id}`}>Your private note</label><span>Only you can see this</span></div>
              <textarea id={`quote-note-${q.id}`} value={noteText} maxLength={1000} onChange={event=>{setNotes(current=>({...current,[Number(q.id)]:event.target.value}));setSaved(null);setSaveError(null)}} placeholder="Questions to ask or details to remember"/>
              <div className="quote-compare-note-footer"><span>{noteText.length}/1000</span><button type="button" onClick={()=>void saveNote(Number(q.id))} disabled={!onSaveNote||saving===Number(q.id)||noteText===(q.customer_note||'')}>{saving===Number(q.id)?<><LoaderCircle size={13} className="animate-spin"/> Saving</>:saved===Number(q.id)?<><Check size={13}/> Saved</>:<>Save note <ArrowRight size={13}/></>}</button></div>
              {saveError===Number(q.id)&&<p role="alert" className="quote-compare-error">Couldn’t save your note. Please try again.</p>}
            </div>
          </article>
        })}</div>
      </div>
      <footer className="quote-compare-footer"><span><ShieldCheck size={15}/> Take your time—your notes stay private.</span><button type="button" onClick={onClose}>Done comparing</button></footer>
    </section>
  </div>
}
function CustomerRequests({requests,quotes,query,onRequest,onOpen,onDecision,onCancel,onSaveQuoteNote,onRefresh}:{requests:Row[];quotes:Row[];query:string;onRequest:()=>void;onOpen:(r:Row)=>void;onDecision:(q:Row,s:'accepted'|'declined')=>void;onCancel:(r:Row)=>void;onSaveQuoteNote:(id:number,note:string)=>Promise<boolean>;onRefresh:()=>Promise<void>}){
  const openCount=requests.filter(request=>request.status==='open').length
  const acceptedCount=requests.filter(request=>request.status==='accepted').length
  const quoteCount=quotes.filter(quote=>requests.some(request=>Number(request.id)===Number(quote.repair_request_id))).length
  return <section className="customer-requests-panel rounded-2xl border bg-white p-5 dark:border-[#2a3834] dark:bg-[#1e2a27] sm:p-7">
    <div className="requests-panel-heading"><div><span className="requests-panel-kicker"><FileText size={13}/> REPAIR CENTER</span><h2>Every repair, in one place.</h2><p>Follow progress, compare shop responses, and choose what works for you.</p></div><button onClick={onRequest} className="requests-new-button"><Plus size={16}/> New request</button></div>
    <div className="requests-summary" aria-label="Request summary">
      <div><span className="requests-summary-icon tone-mint"><FileText size={16}/></span><span><strong>{requests.length}</strong><small>{requests.length===1?'Total request':'Total requests'}</small></span></div>
      <div><span className="requests-summary-icon tone-gold"><Clock3 size={16}/></span><span><strong>{openCount}</strong><small>In progress</small></span></div>
      <div><span className="requests-summary-icon tone-blue"><CircleDollarSign size={16}/></span><span><strong>{quoteCount}</strong><small>{quoteCount===1?'Shop response':'Shop responses'}</small></span></div>
      <div><span className="requests-summary-icon tone-lavender"><CheckCircle2 size={16}/></span><span><strong>{acceptedCount}</strong><small>Accepted repairs</small></span></div>
    </div>
    <div className="requests-list-heading"><div><h3>Your repair activity</h3><p>{query?'Showing results that match your search.':'Most recent requests appear first.'}</p></div><span>{requests.length} {requests.length===1?'request':'requests'}</span></div>
    <div className="requests-list">{requests.map(r=><RequestProgress key={r.id} request={r} quotes={quotes.filter(q=>Number(q.repair_request_id)===Number(r.id))} onOpen={onOpen} onDecision={onDecision} onCancel={onCancel} onSaveQuoteNote={onSaveQuoteNote} onRefresh={onRefresh}/>)}
      {!requests.length&&<Empty title={query?'No matching requests':'Your repair journey starts here'} description={query?'Try a different search, or clear the search field to see all your requests.':'Describe what your vehicle needs and compare quotes from local shops—all from one place.'} actionLabel={query?undefined:'Create your first request'} onAction={query?undefined:onRequest}/>}
    </div>
  </section>
}
function ShopRequests({requests,onQuote}:{requests:Row[];onQuote:(r:Row)=>void}){
  const [filter,setFilter]=useState<'All'|'Urgent'|'Within a week'|'Flexible'>('All')
  const filters=['All','Urgent','Within a week','Flexible'] as const
  const filtered=requests.filter(request=>filter==='All'||String(request.timing||'Flexible')===filter)
  const counts={All:requests.length,Urgent:requests.filter(request=>request.timing==='Urgent').length,'Within a week':requests.filter(request=>request.timing==='Within a week').length,Flexible:requests.filter(request=>!request.timing||request.timing==='Flexible').length}
  return <section className="shop-requests-panel">
    <div className="shop-requests-intro"><span className="shop-requests-icon"><Store size={20}/></span><div><span className="shop-section-kicker">LOCAL REPAIR MARKETPLACE</span><h2>Find your next great job.</h2><p>Review repair requests from local customers and send a quote when it’s a good fit.</p></div><div className="shop-requests-total"><strong>{requests.length}</strong><span>open {requests.length===1?'opportunity':'opportunities'}</span></div></div>
    <div className="shop-request-summary">
      <div><span className="shop-request-summary-icon"><Wrench size={16}/></span><span><strong>{requests.length}</strong><small>Available to quote</small></span></div>
      <div><span className="shop-request-summary-icon urgent"><Sparkles size={16}/></span><span><strong>{counts.Urgent}</strong><small>Marked urgent</small></span></div>
      <div><span className="shop-request-summary-icon week"><CalendarDays size={16}/></span><span><strong>{counts['Within a week']}</strong><small>Needed this week</small></span></div>
    </div>
    <div className="shop-requests-toolbar"><div><h3>Open requests</h3><p>Requests you haven’t quoted yet.</p></div><div className="shop-request-filters" aria-label="Filter by requested timing">{filters.map(item=><button key={item} aria-pressed={filter===item} onClick={()=>setFilter(item)} className={filter===item?'is-active':''}>{item}<span>{counts[item]}</span></button>)}</div></div>
    <div className="shop-requests-grid">{filtered.map(request=><ShopJobCard key={request.id} request={request} onQuote={onQuote}/>)}
      {!filtered.length&&<div className="shop-requests-empty"><span><Wrench size={22}/></span><h3>{requests.length?'No requests in this timing category.':'You’re all caught up.'}</h3><p>{requests.length?'Try another timing filter to see more opportunities.':'New customer requests will appear here as soon as they’re posted.'}</p>{requests.length>0&&<button onClick={()=>setFilter('All')}>Show all open requests <ArrowRight size={14}/></button>}</div>}
    </div>
  </section>
}
function ShopJobCard({request,onQuote}:{request:Row;onQuote:(r:Row)=>void}){return <article className="shop-opportunity-card rounded-xl border border-[#e3e6e0] p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-[#2a3834]"><div className="shop-opportunity-top"><span className="shop-opportunity-icon"><Wrench size={17}/></span><span className="shop-open-badge"><i/> Open request</span></div><div className="flex items-start justify-between gap-3"><div><p className="shop-opportunity-title">{request.service}</p><p className="mt-1 text-sm text-[#67716f] dark:text-[#b9c5bf]">{request.description}</p></div></div><div className="shop-opportunity-meta"><span><CalendarDays size={14}/>{request.timing||'Flexible timing'}</span><span><MapPin size={14}/>{request.distance||'Local'}</span><span><span className="shop-customer-dot">{String(request.customer_name||'C').charAt(0).toUpperCase()}</span>{request.customer_name||'Customer'}</span></div><button onClick={()=>onQuote(request)} className="shop-opportunity-cta mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#e96832] px-4 py-2.5 text-sm font-bold text-white"><CircleDollarSign size={16}/> Send a quote <ArrowRight size={15}/></button></article>}
function ShopQuotes({quotes,setActive}:{quotes:Row[];setActive:(section:string)=>void}){
  const [filter,setFilter]=useState<'All'|'Pending'|'Accepted'|'Declined'>('All')
  const statuses=['All','Pending','Accepted','Declined'] as const
  const filtered=quotes.filter(quote=>filter==='All'||quote.status===filter.toLowerCase())
  const pending=quotes.filter(quote=>quote.status==='pending').length
  const accepted=quotes.filter(quote=>quote.status==='accepted').length
  const declined=quotes.filter(quote=>quote.status==='declined').length
  const counts={All:quotes.length,Pending:pending,Accepted:accepted,Declined:declined}
  return <section className="shop-quotes-panel">
    <div className="shop-quotes-intro"><span className="shop-quotes-icon"><CircleDollarSign size={20}/></span><div><span className="shop-section-kicker">QUOTE PIPELINE</span><h2>Every quote, accounted for.</h2><p>See what’s waiting on customers, what’s been accepted, and what’s next.</p></div><div className="shop-quotes-total"><strong>{quotes.length}</strong><span>quotes sent</span></div></div>
    <div className="shop-quote-summary">
      <div><span className="shop-quote-summary-icon pending"><Clock3 size={16}/></span><span><strong>{pending}</strong><small>Awaiting a reply</small></span></div>
      <div><span className="shop-quote-summary-icon accepted"><CheckCircle2 size={16}/></span><span><strong>{accepted}</strong><small>Accepted</small></span></div>
      <div><span className="shop-quote-summary-icon declined"><XCircle size={16}/></span><span><strong>{declined}</strong><small>Not selected</small></span></div>
    </div>
    <div className="shop-quotes-toolbar"><div><h3>Your quote activity</h3><p>Quotes are sorted with the most recently updated first.</p></div><div className="shop-quote-filters" aria-label="Filter quotes by status">{statuses.map(item=><button key={item} aria-pressed={filter===item} onClick={()=>setFilter(item)} className={filter===item?'is-active':''}>{item}<span>{counts[item]}</span></button>)}</div></div>
    <div className="shop-quote-list">{filtered.map(quote=><article key={quote.id} className="shop-quote-card">
      <div className="shop-quote-card-top"><span className="shop-quote-service-icon"><Wrench size={17}/></span><span className={`shop-quote-status status-${quote.status}`}>{quote.status==='pending'?'Awaiting reply':quote.status==='accepted'?'Accepted':'Not selected'}</span></div>
      <div className="shop-quote-card-heading"><div><h3>{quote.request_service||'Repair quote'}</h3><p><UserRound size={13}/>{quote.customer_name||'Customer'} <i/> Request #{quote.repair_request_id}</p></div><strong>${Number(quote.price).toFixed(2)}</strong></div>
      <p className="shop-quote-estimate">{quote.estimate||'No estimate details added.'}</p>
      <div className="shop-quote-meta">{quote.timing&&<span><Clock3 size={13}/>{quote.timing}</span>}{quote.warranty&&<span><ShieldCheck size={13}/>{quote.warranty}</span>}<span className={`shop-request-status request-${quote.request_status||'unknown'}`}>Request {quote.request_status||'status unavailable'}</span></div>
      {quote.status==='accepted'&&<button className="shop-quote-appointment-link" onClick={()=>setActive('Appointments')}><CalendarDays size={14}/> Manage repair appointment <ArrowRight size={14}/></button>}
    </article>)}
      {!filtered.length&&<div className="shop-quotes-empty"><span><CircleDollarSign size={22}/></span><h3>{quotes.length?`No ${filter.toLowerCase()} quotes.`:'Your quote pipeline starts here.'}</h3><p>{quotes.length?'Choose another status filter to see more quote activity.':'Send a quote on an open repair request and track its progress here.'}</p>{quotes.length>0&&<button onClick={()=>setFilter('All')}>View all quotes <ArrowRight size={14}/></button>}</div>}
    </div>
  </section>
}
function ShopDirectory({shops,saved,query,onSave}:{shops:Row[];saved:Row[];query:string;onSave:(s:Row)=>void}){
  const [location,setLocation]=useState(''), [nearby,setNearby]=useState(false), [selected,setSelected]=useState<Row|null>(null), [verifiedOnly,setVerifiedOnly]=useState(false), [savingId,setSavingId]=useState<number|null>(null)
  const savedIds=new Set(saved.map(s=>Number(s.shop_id)))
  const locationTerms=location.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean)
  const matches=shops.filter(shop=>{const address=`${shop.city||''} ${shop.state||''} ${shop.postal_code||''}`.toLowerCase().replace(/[^a-z0-9]+/g,' ');return (!nearby||locationTerms.every(term=>address.includes(term)))&&(!verifiedOnly||Boolean(shop.is_verified))&&matchesSearch(shop,query)})
  const verifiedCount=shops.filter(shop=>Boolean(shop.is_verified)).length
  function findNearby(){ if(location.trim()) setNearby(true) }
  async function save(shop:Row){setSavingId(Number(shop.id));try{await onSave(shop)}finally{setSavingId(null)}}
  function servicesFor(shop:Row):string[]{if(Array.isArray(shop.services))return shop.services.filter((service:unknown):service is string=>typeof service==='string');if(typeof shop.services==='string'){try{const parsed=JSON.parse(shop.services);return Array.isArray(parsed)?parsed.filter((service:unknown):service is string=>typeof service==='string'):[]}catch{return []}}return []}
  return <>
    <section className="shop-directory-panel rounded-2xl border bg-white p-5 dark:border-[#2a3834] dark:bg-[#1e2a27] sm:p-7">
      <div className="directory-intro"><span className="directory-intro-icon"><Store size={20}/></span><div><span className="directory-kicker">LOCAL REPAIR NETWORK</span><h2>Meet your next trusted shop.</h2><p>Explore local repair teams, see what they specialize in, and save the ones you like.</p></div><div className="directory-total"><strong>{shops.length}</strong><span>local {shops.length===1?'shop':'shops'}</span></div></div>
      <div className="directory-search-panel">
        <div className="directory-search-fields"><label className="directory-location-field"><span>Location</span><span className="directory-input-wrap"><MapPin size={16}/><input id="shop-location" value={location} onChange={e=>{setLocation(e.target.value);setNearby(false)}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();findNearby()}}} placeholder="City, state, or ZIP code" aria-label="City, state, or ZIP code"/></span></label><button onClick={findNearby} className="directory-search-button"><Search size={16}/> Find shops</button>{nearby&&<button onClick={()=>{setNearby(false);setLocation('')}} className="directory-clear-button">Clear location</button>}</div>
        <div className="directory-filter-row"><button type="button" aria-pressed={!verifiedOnly} onClick={()=>setVerifiedOnly(false)} className={`directory-filter-chip ${!verifiedOnly?'is-active':''}`}>All shops <span>{shops.length}</span></button><button type="button" aria-pressed={verifiedOnly} onClick={()=>setVerifiedOnly(current=>!current)} className={`directory-filter-chip ${verifiedOnly?'is-active':''}`}><ShieldCheck size={13}/> Verified <span>{verifiedCount}</span></button><span className="directory-results-count">Showing <strong>{matches.length}</strong> {matches.length===1?'result':'results'}{nearby&&location?` in ${location}`:''}</span></div>
      </div>
      <div className="directory-shop-grid">{matches.map(shop=>{const services=servicesFor(shop);const savedShop=savedIds.has(Number(shop.id));return <article key={shop.id} className="directory-shop-card">
        <div className="directory-shop-top"><span className="directory-shop-avatar">{String(shop.name||'R').trim().charAt(0).toUpperCase()}</span><div className="directory-shop-heading"><h3>{shop.name}</h3><p><MapPin size={13}/>{[shop.city,shop.state].filter(Boolean).join(', ')||'Location not listed'}</p></div><span className="directory-rating"><Star size={13} className="fill-current"/>{Number(shop.rating||0).toFixed(1)}</span></div>
        {shop.is_verified&&<span className="directory-verified-badge"><ShieldCheck size={12}/> Verified shop</span>}
        <p className="directory-shop-description">{shop.description||'A local repair team ready to help with your vehicle.'}</p>
        {services.length>0&&<div className="directory-service-list">{services.slice(0,4).map((service:string)=><span key={service}>{service}</span>)}{services.length>4&&<span>+{services.length-4} more</span>}</div>}
        <div className="directory-shop-footer"><span className="directory-review-count">{Number(shop.review_count||0)} {Number(shop.review_count||0)===1?'review':'reviews'}</span><button onClick={()=>setSelected(shop)} className="directory-details-button">Details <ArrowRight size={14}/></button><button disabled={savedShop||savingId===Number(shop.id)} onClick={()=>void save(shop)} className={`directory-save-button ${savedShop?'is-saved':''}`}>{savedShop?<><Check size={14}/> Saved</>:savingId===Number(shop.id)?'Saving…':<><Bookmark size={14}/> Save shop</>}</button></div>
      </article>})}
      {!matches.length&&<div className="directory-empty md:col-span-2"><span><MapPin size={20}/></span><h3>{shops.length===0?'No shops are listed yet':'No shops found'}</h3><p>{shops.length===0?'Local repair shop profiles will appear here as they join.':nearby&&location?'Try a broader city, state, or ZIP code, or clear the location filter.':'Try changing your search or turn off the verified filter.'}</p>{(nearby||verifiedOnly)&&<button onClick={()=>{setNearby(false);setLocation('');setVerifiedOnly(false)}}>Clear filters</button>}</div>}
      </div>
    </section>{selected&&<ShopDetailsModal shop={selected} onClose={()=>setSelected(null)}/>}
  </>
}
function ShopDetailsModal({shop,onClose}:{shop:Row;onClose:()=>void}){let services:string[]=[];try{services=Array.isArray(shop.services)?shop.services:JSON.parse(shop.services||'[]')}catch{}return <Modal title={shop.name} subtitle={shop.description||'Repair shop details'} onClose={onClose}><div className="space-y-4 text-sm"><p className="flex gap-2"><MapPin size={17} className="shrink-0 text-[#e96832]"/>{[shop.address,shop.city,shop.state,shop.postal_code].filter(Boolean).join(', ')||'Address not provided'}</p><p className="flex gap-2"><Star size={17} className="shrink-0 fill-current text-amber-500"/>{Number(shop.rating||0).toFixed(1)} rating · {shop.review_count||0} reviews</p>{shop.phone&&<p><strong>Phone:</strong> <a className="text-[#c75324]" href={`tel:${shop.phone}`}>{shop.phone}</a></p>}{shop.email&&<p><strong>Email:</strong> <a className="text-[#c75324]" href={`mailto:${shop.email}`}>{shop.email}</a></p>}<div><strong>Services</strong><div className="mt-2 flex flex-wrap gap-2">{services.length?services.map(s=><span key={s} className="rounded-full bg-[#f1f3ef] px-3 py-1 text-xs dark:bg-[#26332f]">{s}</span>):<span className="text-[#8a928e]">Services not listed</span>}</div></div>{shop.is_verified&&<p className="flex items-center gap-2 text-emerald-700"><ShieldCheck size={17}/>Verified shop</p>}</div></Modal>}
function SavedShops({shops,profiles,onBrowse}:{shops:Row[];profiles:Row[];onBrowse:()=>void}){
  const [selected,setSelected]=useState<Row|null>(null)
  return <>
    <section className="saved-shops-panel rounded-2xl border bg-white p-5 dark:border-[#2a3834] dark:bg-[#1e2a27] sm:p-7">
      <div className="saved-shops-intro"><span className="saved-shops-icon"><Bookmark size={19}/></span><div><span className="directory-kicker">YOUR PERSONAL SHORTLIST</span><h2>Good shops, close at hand.</h2><p>Keep trusted local repair shops together so they’re easy to find when you need them.</p></div><div className="saved-count"><strong>{shops.length}</strong><span>saved {shops.length===1?'shop':'shops'}</span></div></div>
      <div className="saved-shops-grid">{shops.map(saved=>{const profile=profiles.find(item=>Number(item.id)===Number(saved.shop_id));return <article key={saved.id} className="saved-shop-card">
        <div className="saved-shop-card-top"><span className="saved-shop-avatar"><Store size={19}/></span><span className="saved-shop-status"><Check size={12}/> SAVED</span></div>
        <h3>{saved.shop}</h3>
        <p className="saved-shop-location"><MapPin size={13}/>{[profile?.city,profile?.state].filter(Boolean).join(', ')||'Location not listed'}</p>
        {profile?.description&&<p className="saved-shop-description">{profile.description}</p>}
        {profile?.is_verified&&<span className="directory-verified-badge"><ShieldCheck size={12}/> Verified shop</span>}
        <div className="saved-shop-actions">{profile?<button onClick={()=>setSelected(profile)} className="saved-shop-details-button">View shop details <ArrowRight size={14}/></button>:<span className="saved-shop-unavailable">Shop profile is no longer available.</span>}</div>
      </article>})}
      {!shops.length&&<div className="saved-shops-empty"><span><Bookmark size={21}/></span><h3>Your shortlist is ready when you are.</h3><p>Save shops you trust while browsing, and they’ll be easy to find here later.</p><button onClick={onBrowse}><Store size={15}/> Explore local shops <ArrowRight size={14}/></button></div>}
      </div>
    </section>
    {selected&&<ShopDetailsModal shop={selected} onClose={()=>setSelected(null)}/>}
  </>
}
function Empty({title='Nothing here yet',description='Your activity will appear here as you use Auto Repair Finder.',actionLabel,onAction}:{title?:string;description?:string;actionLabel?:string;onAction?:()=>void}){return <div className="rounded-xl border border-dashed p-8 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-[#67716f]">{description}</p>{actionLabel&&onAction&&<button onClick={onAction} className="mt-4 rounded-xl bg-[#e96832] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#d95825]">{actionLabel}</button>}</div>}
function NotificationPanel({notifications,onRead}:{notifications:Row[];onRead:()=>void}){return <div role="dialog" aria-label="Notifications" className="absolute right-0 top-12 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#e3e6e0] bg-white shadow-2xl dark:border-[#2a3834] dark:bg-[#1e2a27]"><div className="flex items-center justify-between border-b p-4 dark:border-[#2a3834]"><div><p className="font-bold">Notifications</p><p className="text-xs text-[#8a928e]">Updates about requests and quotes</p></div>{notifications.some(n=>!n.read_at)&&<button onClick={onRead} className="text-xs font-bold text-[#c75324]">Mark all read</button>}</div><div className="max-h-[360px] overflow-y-auto p-2">{notifications.map(n=><div key={n.id} className={`rounded-xl p-3 ${!n.read_at?'bg-[#fff4ee] dark:bg-[#34261f]':''}`}><p className="text-sm font-semibold">{n.title}</p><p className="mt-1 text-xs leading-5 text-[#67716f] dark:text-[#b9c5bf]">{n.body}</p><p className="mt-2 text-[10px] text-[#9aa19d]">{new Date(n.created_at).toLocaleString()}</p></div>)}{!notifications.length&&<p className="p-6 text-center text-sm text-[#67716f]">No notifications yet.</p>}</div></div>}
function RequestDetailsModal({request,quotes,onClose,onDecision}:{request:Row;quotes:Row[];onClose:()=>void;onDecision:(q:Row,s:'accepted'|'declined')=>void}){return <Modal title={request.service} subtitle={`Repair request #${request.id}`} onClose={onClose}><div className="space-y-5"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusMeta[request.status]?.className||statusMeta.open.className}`}>{statusMeta[request.status]?.label||request.status}</span><span className="rounded-full bg-[#f1f3ef] px-3 py-1 text-xs font-semibold text-[#67716f] dark:bg-[#26332f] dark:text-[#b9c5bf]">{quotes.length} {quotes.length===1?'quote':'quotes'}</span></div><dl className="grid gap-4 rounded-xl bg-[#f6f7f4] p-4 text-sm dark:bg-[#17211e]"><div><dt className="text-xs font-bold uppercase tracking-wide text-[#8a928e]">Vehicle</dt><dd className="mt-1 font-semibold">{[request.year,request.make,request.model].filter(Boolean).join(' ')||'No vehicle selected'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-[#8a928e]">When</dt><dd className="mt-1">{request.timing||'Flexible'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-[#8a928e]">Request details</dt><dd className="mt-1 whitespace-pre-wrap">{request.description||'No additional details provided.'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-[#8a928e]">Posted</dt><dd className="mt-1">{request.created_at?new Date(request.created_at).toLocaleString():'Date unavailable'}</dd></div></dl><div><h3 className="font-bold">Quotes from local shops</h3>{quotes.length?<div className="mt-3 space-y-3">{quotes.map(quote=>quote.status==='pending'?<QuoteDecisionCard key={quote.id} quote={quote} onDecision={onDecision}/>:<div key={quote.id} className="flex items-center justify-between gap-3 rounded-xl border p-4"><div><p className="font-semibold">{quote.shop_name}</p><p className="mt-1 text-xs capitalize text-[#8a928e]">{quote.status}</p></div><strong className="text-[#c75324]">${Number(quote.price).toFixed(2)}</strong></div>)}</div>:<p className="mt-2 rounded-xl bg-[#f6f7f4] p-4 text-sm text-[#67716f] dark:bg-[#17211e] dark:text-[#b9c5bf]">Your request is posted. Quotes will appear here as shops respond.</p>}</div></div></Modal>}
function QuoteModal({request,error,submitting,onClose,onSubmit}:{request:Row;error:string;submitting:boolean;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){return <Modal title="Send a repair quote" subtitle={`${request.service} · ${request.customer_name||'Customer'}`} onClose={onClose}><form onSubmit={onSubmit}><Field label="Price"><input name="price" required min="1" step="0.01" type="number" className="input" placeholder="450.00"/></Field><Field label="Estimate"><textarea name="estimate" className="input min-h-24" placeholder="Parts and labor included"/></Field><Field label="Timing"><input name="timing" className="input" placeholder="2–3 hours"/></Field><Field label="Warranty"><input name="warranty" className="input" placeholder="12 months / 12,000 miles"/></Field>{error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200">{error}</p>}<button disabled={submitting} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e96832] font-bold text-white disabled:cursor-wait disabled:opacity-60">{submitting?'Sending quote…':'Send quote'}</button></form></Modal>}
function RequestModal({vehicles,error,submitting,onClose,onSubmit}:{vehicles:Row[];error:string;submitting:boolean;onClose:()=>void;onSubmit:(e:FormEvent<HTMLFormElement>)=>void}){
  const [service,setService]=useState('')
  const [description,setDescription]=useState('')
  const [vehicleId,setVehicleId]=useState('')
  const [timing,setTiming]=useState('Flexible')
  const suggestions=['Brake repair','Check engine light','Oil change','Tire service','Battery issue']
  const timings=[{value:'Flexible',detail:'No rush',icon:Clock3},{value:'Within a week',detail:'Coming up',icon:CalendarDays},{value:'Urgent',detail:'As soon as possible',icon:Sparkles}]
  return <Modal title="Tell us what your car needs" subtitle="Share a few details and local shops can send you quotes." onClose={onClose} className="request-composer-dialog">
    <form onSubmit={onSubmit} className="request-composer">
      <div className="request-composer-intro"><span className="request-composer-icon"><Wrench size={19}/></span><div><strong>Let’s find the right help.</strong><p>Clear details help shops give you more useful quotes.</p></div><span className="request-composer-private"><Sparkles size={13}/> No obligation</span></div>

      <section className="request-composer-section">
        <div className="request-section-heading"><span className="request-section-number">01</span><div><h3>Which vehicle needs attention?</h3><p>Choose one from your garage, or continue without one.</p></div></div>
        <input type="hidden" name="vehicleId" value={vehicleId}/>
        <div className={`request-vehicle-grid ${vehicles.length?'':'has-no-vehicles'}`}>
          <button type="button" aria-pressed={!vehicleId} onClick={()=>setVehicleId('')} className={`request-vehicle-choice request-vehicle-skip ${!vehicleId?'is-selected':''}`}><span className="request-vehicle-icon"><CarFront size={19}/></span><span className="request-vehicle-copy"><strong>Skip for now</strong><small>Add vehicle details in your request</small></span><span className="request-choice-check"><Check size={13}/></span></button>
          {vehicles.map(vehicle=>{const id=String(vehicle.id);return <button key={id} type="button" aria-pressed={vehicleId===id} onClick={()=>setVehicleId(id)} className={`request-vehicle-choice ${vehicleId===id?'is-selected':''}`}><span className="request-vehicle-icon"><CarFront size={19}/></span><span className="request-vehicle-copy"><strong>{vehicle.year} {vehicle.make}</strong><small>{vehicle.model}{vehicle.trim?` · ${vehicle.trim}`:''}</small></span><span className="request-choice-check"><Check size={13}/></span></button>})}
        </div>
      </section>

      <section className="request-composer-section">
        <div className="request-section-heading"><span className="request-section-number">02</span><div><h3>What service do you need?</h3><p>Pick a common repair or enter your own.</p></div></div>
        <label className="request-field-label" htmlFor="request-service">Service needed <span>Required</span></label>
        <input id="request-service" name="service" required maxLength={120} value={service} onChange={event=>setService(event.target.value)} className="input request-service-input" placeholder="e.g. Brake inspection"/>
        <div className="request-suggestions" aria-label="Common repair types">{suggestions.map(suggestion=><button type="button" key={suggestion} aria-pressed={service===suggestion} onClick={()=>setService(suggestion)} className={service===suggestion?'is-selected':''}>{suggestion}</button>)}</div>
      </section>

      <section className="request-composer-section">
        <div className="request-section-heading"><span className="request-section-number">03</span><div><h3>Describe what’s happening</h3><p>Symptoms, sounds, warning lights, or recent changes are helpful.</p></div></div>
        <label className="request-field-label" htmlFor="request-description">Repair details <span>Required</span></label>
        <textarea id="request-description" name="description" required maxLength={3000} value={description} onChange={event=>setDescription(event.target.value)} className="input request-description-input" placeholder="For example: I hear a grinding sound when braking, especially at low speeds."/>
        <div className="request-description-meta"><span>More detail can help shops prepare a better estimate.</span><span>{description.length}/3,000</span></div>
      </section>

      <section className="request-composer-section request-timing-section">
        <div className="request-section-heading"><span className="request-section-number">04</span><div><h3>When would you like service?</h3><p>Let shops know what works for you.</p></div></div>
        <input type="hidden" name="timing" value={timing}/>
        <div className="request-timing-options">{timings.map(({value,detail,icon:Icon})=><button key={value} type="button" aria-pressed={timing===value} onClick={()=>setTiming(value)} className={`request-timing-choice ${timing===value?'is-selected':''}`}><Icon size={16}/><span><strong>{value}</strong><small>{detail}</small></span><span className="request-timing-radio"/></button>)}</div>
      </section>

      {error&&<p role="alert" className="request-composer-error">{error}</p>}
      <div className="request-composer-footer"><p><ShieldCheck size={14}/> Compare the quotes before deciding which shop is right for you.</p><button disabled={submitting} className="request-submit-button"><span>{submitting?'Posting your request…':'Find repair shops'}</span><ArrowRight size={17}/></button></div>
    </form>
  </Modal>
}
function Modal({title,subtitle,onClose,children,className=''}:{title:string;subtitle:string;onClose:()=>void;children:ReactNode;className?:string}){const titleId=useId();useEffect(()=>{function handleKeyDown(event:KeyboardEvent){if(event.key==='Escape')onClose()}window.addEventListener('keydown',handleKeyDown);return()=>window.removeEventListener('keydown',handleKeyDown)},[onClose]);return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}><section role="dialog" aria-modal="true" aria-labelledby={titleId} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[#e3e6e0] bg-white p-5 shadow-2xl dark:border-[#2a3834] dark:bg-[#1e2a27] sm:max-w-lg sm:rounded-2xl sm:p-7 ${className}`} onClick={event=>event.stopPropagation()}><div className="flex justify-between gap-4"><div><h2 id={titleId} className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-[#67716f] dark:text-[#b9c5bf]">{subtitle}</p></div><button type="button" onClick={onClose} aria-label="Close dialog" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[#67716f] hover:bg-[#f1f3ef] dark:text-[#b9c5bf] dark:hover:bg-[#26332f]"><X/></button></div><div className="mt-5">{children}</div></section></div>}
function Field({label,children}:{label:string;children:ReactNode}){return <label className="mt-4 block text-sm font-semibold">{label}{children}</label>}
