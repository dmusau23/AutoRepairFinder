import { consumeFirstVisit, getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Dashboard from '@/components/dashboard'
import { db } from '@/lib/db'
import Link from 'next/link'
import { ArrowDown, ArrowRight, BadgeCheck, Check, ChevronRight, CircleDollarSign, Clock3, MapPin, ShieldCheck, Star, Wrench } from 'lucide-react'

export default async function Home() {
  const session = await getSession()
  if (session?.role === 'admin') redirect('/admin')
  if (session?.user) return <Dashboard initialRole={session.role === 'shop' ? 'Shop' : 'Customer'} userName={session.user.name} firstVisit={consumeFirstVisit(session.user.id)} />
  const shops = db.prepare('SELECT id,name,description,city,state,rating,review_count,is_verified,profile_image FROM shop_profiles ORDER BY rating DESC LIMIT 3').all() as any[]

  return <main className="landing-page">
    <header className="landing-header">
      <Link href="/" className="landing-brand" aria-label="Auto Repair Finder home">
        <span className="landing-mark"><Wrench size={20} strokeWidth={2.2} /></span>
        <span><strong>Auto Repair Finder</strong><small>Better care for your car</small></span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="#how-it-works" className="landing-nav-link">How it works</Link>
        <Link href="#shops" className="landing-nav-link landing-nav-shops">Explore shops</Link>
        <Link href="/sign-in" className="landing-signin">Sign in</Link>
        <Link href="/create-account" className="landing-nav-cta">Get started <ArrowRight size={15} /></Link>
      </nav>
    </header>

    <section className="landing-hero">
      <div className="landing-hero-copy">
        <p className="landing-eyebrow"><span className="landing-eyebrow-dot" /> A better way to find your mechanic</p>
        <h1>Good car care.<br /><span>Clear choices.</span></h1>
        <p className="landing-lede">Find trusted local repair shops, compare straightforward quotes, and choose what feels right. No guesswork. No pressure.</p>
        <div className="landing-actions">
          <Link href="/create-account" className="landing-primary">Find your repair shop <ArrowRight size={17} /></Link>
          <Link href="#shops" className="landing-secondary">Meet local shops <ArrowDown size={16} /></Link>
        </div>
        <div className="landing-proof"><span className="landing-avatar-stack"><i>J</i><i>M</i><i>A</i></span><span><strong>Care you can feel good about</strong><small>Compare shops on your terms</small></span><ShieldCheck size={19} /></div>
      </div>

      <div className="landing-visual" aria-label="Example repair quote comparison">
        <div className="landing-visual-glow" />
        <div className="landing-visual-top"><span className="landing-live"><i /> YOUR REPAIR, MADE SIMPLE</span><span className="landing-visual-index">01 — 03</span></div>
        <div className="landing-repair-summary"><span className="landing-repair-icon"><Wrench size={19} /></span><div><span>YOUR REPAIR</span><strong>Brake inspection</strong><small>2019 Honda Civic · Front brakes</small></div><span className="landing-summary-check"><Check size={16} /></span></div>
        <div className="landing-quote-heading"><span>LOCAL QUOTES</span><span>Easy to compare</span></div>
        <article className="landing-quote-card landing-quote-featured">
          <div className="landing-quote-shop"><span className="landing-shop-monogram">N</span><span><strong>Northside Auto</strong><small><Star size={12} fill="currentColor" /> 4.9 <i>·</i> Verified shop</small></span><BadgeCheck className="landing-verified" size={18} /></div>
          <div className="landing-quote-price"><strong>$385</strong><span>Parts &amp; labor</span></div>
          <div className="landing-quote-foot"><span><Clock3 size={14} /> Ready tomorrow</span><span>12-month warranty</span></div>
        </article>
        <article className="landing-quote-card landing-quote-secondary">
          <div className="landing-quote-shop"><span className="landing-shop-monogram landing-shop-monogram-blue">M</span><span><strong>Maple Street Garage</strong><small><Star size={12} fill="currentColor" /> 4.8 <i>·</i> Verified shop</small></span></div>
          <div className="landing-quote-price"><strong>$420</strong><span>Parts &amp; labor</span></div>
        </article>
        <div className="landing-visual-note"><span><CircleDollarSign size={17} /></span><p><strong>It’s your call.</strong><small>Compare the details. Pick your shop.</small></p><ChevronRight size={17} /></div>
      </div>
      <div className="landing-hero-foot"><span>LESS STRESS, MORE CONFIDENCE</span><span>01 / Find <i /> 02 / Compare <i /> 03 / Choose</span></div>
    </section>

    <section id="how-it-works" className="landing-steps-section">
      <div className="landing-section-intro"><p className="landing-section-kicker">A little more peace of mind</p><h2>Car repairs, on your terms.</h2><p>From the first search to the final decision, everything is easier to understand.</p></div>
      <div className="landing-steps">
        {[['01', 'Tell us what’s going on', 'Share the repair you need and a few details about your car.'], ['02', 'Compare local options', 'Review shop profiles and quotes with pricing, timing, and warranty details.'], ['03', 'Choose with confidence', 'Pick the shop that works for you and keep everything in one place.']].map(([number, title, description]) =>
          <article className="landing-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div><ArrowRight size={17} /></article>)}
      </div>
    </section>

    <section id="shops" className="landing-shops-section">
      <div className="landing-shops-heading"><div><p className="landing-section-kicker">Your neighborhood, better connected</p><h2>Good people. Great local shops.</h2><p>Get to know the businesses ready to help keep you moving.</p></div><Link href="/create-account">Explore all shops <ArrowRight size={16} /></Link></div>
      <div className="landing-shop-grid">{shops.map(shop => <article key={shop.id} className="landing-shop-card">
        <div className="landing-shop-card-top">{shop.profile_image ? <img src={shop.profile_image} alt="" /> : <span className="landing-shop-placeholder"><Wrench size={21} /></span>}<span className="landing-rating"><Star size={14} fill="currentColor" /> {Number(shop.rating || 0).toFixed(1)}</span></div>
        <h3>{shop.name}</h3><p>{shop.description || 'Local automotive repair and maintenance.'}</p>
        <div className="landing-shop-meta"><span><MapPin size={14} />{shop.city || 'Local'}{shop.state ? `, ${shop.state}` : ''}</span><span>{shop.is_verified ? <><BadgeCheck size={14} /> Verified</> : `${shop.review_count || 0} reviews`}</span></div>
      </article>)}{!shops.length && <div className="landing-shop-empty"><Wrench size={20} /><p>Local shops are joining the network.</p><span>Create an account to see new listings as they arrive.</span></div>}</div>
    </section>

    <section className="landing-bottom-cta"><div><p>YOUR NEXT REPAIR, A LITTLE EASIER</p><h2>Start with a better choice.</h2><span>It’s free to explore. You’re always in control.</span></div><Link href="/create-account">Get started <ArrowRight size={17} /></Link></section>
    <footer className="landing-footer"><Link href="/" className="landing-footer-brand"><span className="landing-mark"><Wrench size={17} /></span> Auto Repair Finder</Link><span>Good car care. Clear choices.</span><Link href="/sign-in">Sign in <ArrowRight size={14} /></Link></footer>
  </main>
}
