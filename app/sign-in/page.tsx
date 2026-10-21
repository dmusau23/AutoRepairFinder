'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench } from 'lucide-react'
import Link from 'next/link'
import { signIn } from '@/lib/auth-client'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setError('')
    const result = await signIn.email({ email, password })
    if (result.error) { setError((result.error as any)?.error || 'Unable to sign in. Check your email and password.'); setLoading(false); return }
    const profile = await fetch('/api/profile').then((response) => response.json())
    router.push(profile.role === 'shop' ? '/shop' : '/customer')
    router.refresh()
  }

  return <AuthShell title="Welcome back" subtitle="Sign in to manage repairs, quotes, and appointments."><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-semibold">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" placeholder="you@example.com" /></label><label className="block text-sm font-semibold">Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" placeholder="••••••••" /></label>{error && <p className="text-sm font-medium text-red-600">{error}</p>}<button disabled={loading} className="auth-primary">{loading ? 'Signing in…' : 'Sign in'}</button><p className="text-center text-sm text-[#67716f]">New here? <a className="font-bold text-[#c75324]" href="/create-account">Create an account</a></p></form></AuthShell>
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <main className="auth-page"><div className="auth-card"><Link href="/" className="mb-8 flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-[#e96832] text-white"><Wrench size={20} /></div><div><p className="font-bold">Auto Repair Finder</p><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a928e]">Your repair, your choice</p></div></Link><h1 className="text-3xl font-bold tracking-tight">{title}</h1><p className="mt-2 mb-7 text-sm leading-6 text-[#67716f]">{subtitle}</p>{children}<p className="mt-5 text-center text-xs text-[#8a928e]"><Link href="/" className="font-bold text-[#c75324]">Explore the site first</Link></p></div></main> }
