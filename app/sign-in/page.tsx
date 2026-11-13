'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, BadgeCheck, ShieldCheck, Wrench } from 'lucide-react'
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
    try {
      const result = await signIn.email({ email, password })
      if (result.error) { setError((result.error as any)?.error || 'Unable to sign in. Check your email and password.'); return }
      const role = result.data?.role
      router.push(role === 'admin' ? '/admin' : role === 'shop' ? '/shop' : '/customer')
      router.refresh()
    } catch { setError('Unable to sign in right now. Please try again.') }
    finally { setLoading(false) }
  }

  return <AuthShell title="Welcome back" subtitle="Sign in to manage repairs, quotes, and appointments."><form onSubmit={submit} className="auth-form"><label>Email address<input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="auth-input" placeholder="you@example.com" /></label><label>Password<input required autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="auth-input" placeholder="Enter your password" /></label>{error && <p role="alert" className="auth-error">{error}</p>}<button disabled={loading} className="auth-primary">{loading ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button><p className="auth-switch">New to Auto Repair Finder? <Link href="/create-account">Create an account</Link></p></form></AuthShell>
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="auth-page">
    <section className="auth-story">
      <Link href="/" className="auth-brand"><span className="auth-brand-mark"><Wrench size={20} /></span><span><strong>Auto Repair Finder</strong><small>Better care for your car</small></span></Link>
      <div className="auth-story-copy"><span className="auth-story-kicker"><span /> REPAIR, WITH A LITTLE MORE CLARITY</span><h2>Good car care.<br /><span>Clear choices.</span></h2><p>Compare trusted local shops and straightforward quotes. Your car, your call.</p></div>
      <div className="auth-story-card"><div className="auth-story-card-head"><span className="auth-story-icon"><ShieldCheck size={18} /></span><span><strong>A more confident way to repair</strong><small>Everything you need, all in one place.</small></span></div><div className="auth-story-points"><span><BadgeCheck size={16} /> Explore trusted local shops</span><span><BadgeCheck size={16} /> Compare clear quotes</span><span><BadgeCheck size={16} /> Choose what works for you</span></div></div>
      <p className="auth-story-footer">AUTO REPAIR FINDER <span>·</span> GOOD PEOPLE. GOOD WORK.</p>
    </section>
    <section className="auth-panel"><div className="auth-card"><Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link><div className="auth-heading"><p className="auth-kicker">YOUR REPAIR JOURNEY STARTS HERE</p><h1>{title}</h1><p>{subtitle}</p></div>{children}<p className="auth-privacy"><ShieldCheck size={14} /> Your account details stay private and secure.</p></div></section>
  </main>
}
