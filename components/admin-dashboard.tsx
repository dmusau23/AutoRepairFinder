 'use client'
import { useEffect, useState } from 'react'
import { LogOut, ShieldCheck, Users, Store, FileText, BadgeDollarSign } from 'lucide-react'
import { signOut } from '@/lib/auth-client'
export default function AdminDashboard({name}:{name:string}){
 const [data,setData]=useState<any>(null)
 useEffect(()=>{fetch('/api/admin',{cache:'no-store'}).then(r=>r.json()).then(setData)},[])
 async function logout(){await signOut();location.href='/sign-in'}
 return <main className="min-h-screen bg-[#f7f7f4] p-6 text-[#17232f] md:p-10"><div className="mx-auto max-w-6xl">
  <header className="mb-8 flex items-center justify-between rounded-2xl border bg-white p-6"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#c75324]">Admin workspace</p><h1 className="mt-2 text-3xl font-bold">Welcome, {name}.</h1><p className="mt-2 text-[#67716f]">Live platform activity backed by SQLite.</p></div><button onClick={logout} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold"><LogOut size={16}/>Sign out</button></header>
  <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['Customers',data?.customers??'—',Users],['Shops',data?.shops??'—',Store],['Open requests',data?.openRequests??'—',FileText],['Pending quotes',data?.pendingQuotes??'—',BadgeDollarSign]].map(([label,value,Icon]:any)=><article key={label} className="rounded-2xl border bg-white p-5"><Icon className="text-[#e96832]" size={20}/><p className="mt-4 text-xs font-bold uppercase tracking-[.1em] text-[#8a928e]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></article>)}</section>
  <section className="mt-6 rounded-2xl border bg-white p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-[#e96832]"/><div><h2 className="text-xl font-bold">Platform status</h2><p className="text-sm text-[#67716f]">Authentication, repair requests, vehicles, shops and quotes are stored locally in SQLite.</p></div></div></section>
 </div></main>
}