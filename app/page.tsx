import {consumeFirstVisit, getSession} from '@/lib/auth'
import Dashboard from '@/components/dashboard'
import {db} from '@/lib/db'
import Link from 'next/link'
import {ArrowRight, CheckCircle2, MapPin, Star, Wrench} from 'lucide-react'

export default async function Home() {
    const session = await getSession()
    if (session?.user) return <Dashboard initialRole={session.role === 'shop' ? 'Shop' : 'Customer'}
                                         userName={session.user.name} firstVisit={consumeFirstVisit(session.user.id)}/>
    const shops = db.prepare('SELECT id,name,description,city,state,rating,review_count,is_verified,profile_image FROM shop_profiles ORDER BY rating DESC LIMIT 3').all() as any[]
    return <main className="landing-page min-h-screen bg-[#f6f7f4] text-[#17232f]">
        <header className="landing-header mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8"><a href="/"
                                                                                                     className="flex items-center gap-3"><span
            className="flex size-10 items-center justify-center rounded-xl bg-[#e96832] text-white"><Wrench size={20}/></span><span><strong
            className="block">Auto Repair Finder</strong><small
            className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8a928e]">Your repair, your choice</small></span></a>
            <nav className="flex items-center gap-3"><Link href="/sign-in"
                                                           className="rounded-xl px-4 py-2.5 text-sm font-bold">Sign
                in</Link><Link href="/create-account"
                               className="rounded-xl bg-[#e96832] px-4 py-2.5 text-sm font-bold text-white">Get
                started</Link></nav>
        </header>
        <section
            className="landing-hero mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
            <div><p
                className="inline-flex items-center gap-2 rounded-full bg-[#fff0e8] px-3 py-1.5 text-xs font-bold text-[#c75324]">
                <CheckCircle2 size={14}/> Find the right shop with confidence</p><h1
                className="mt-6 max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-.045em] sm:text-6xl">Car trouble
                is hard enough. Finding help shouldn’t be.</h1><p
                className="mt-6 max-w-xl text-lg leading-8 text-[#67716f]">Compare local repair shops, review their
                services, and get clear quotes for your vehicle—all in one place.</p>
                <div className="mt-8 flex flex-wrap gap-3"><a href="#shops"
                                                              className="inline-flex items-center gap-2 rounded-xl bg-[#e96832] px-5 py-3 font-bold text-white">Explore
                    local shops <ArrowRight size={17}/></a><Link href="/create-account"
                                                                 className="rounded-xl border border-[#dfe3dc] bg-white px-5 py-3 font-bold">Create
                    a free account</Link></div>
                <p className="mt-4 text-sm text-[#8a928e]">Browse first. Sign up when you’re ready to request quotes or
                    save shops.</p></div>
            <div className="landing-process rounded-[2rem] bg-[#17211e] p-7 text-white shadow-xl sm:p-10"><p
                className="text-xs font-bold uppercase tracking-[.16em] text-[#f5a27d]">How it works</p>
                <div
                    className="mt-6 space-y-6">{[['01', 'Tell us what your car needs', 'Describe the repair and add your vehicle details.'], ['02', 'Compare local repair shops', 'Review shop profiles, services, and customer ratings.'], ['03', 'Choose the quote that works for you', 'Keep quotes and repair progress together in one workspace.']].map(([n, title, body]) =>
                    <div key={n} className="flex gap-4"><span
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 font-bold text-[#f5a27d]">{n}</span>
                        <div><h2 className="font-bold">{title}</h2><p
                            className="mt-1 text-sm leading-6 text-[#c0cbc5]">{body}</p></div>
                    </div>)}</div>
            </div>
        </section>
        <section id="shops" className="landing-shops border-t border-[#e3e6e0] bg-white">
            <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#8a928e]">Get a feel for the
                        marketplace</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Repair shops on Auto
                        Repair Finder</h2></div>
                    <Link href="/create-account" className="text-sm font-bold text-[#c75324]">Join to request
                        quotes <ArrowRight className="ml-1 inline" size={15}/></Link></div>
                <div className="mt-8 grid gap-4 md:grid-cols-3">{shops.map(shop => <article key={shop.id}
                                                                                            className="landing-shop-card rounded-2xl border border-[#e3e6e0] p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3">{shop.profile_image ? <img src={shop.profile_image} alt=""
                                                                               className="size-12 shrink-0 rounded-xl object-cover"/> :
                            <div
                                className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0e8] text-[#e96832]">
                                <Wrench size={20}/></div>}
                            <div><h3 className="font-bold">{shop.name}</h3><p
                                className="mt-2 text-sm leading-6 text-[#67716f]">{shop.description || 'Local automotive repair and maintenance.'}</p>
                            </div>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-sm font-bold"><Star size={14}
                                                                                                   className="fill-current text-amber-500"/>{Number(shop.rating || 0).toFixed(1)}</span>
                    </div>
                    <p className="mt-4 flex items-center gap-1 text-xs text-[#8a928e]"><MapPin
                        size={13}/>{shop.city || 'Location'}{shop.state ? `, ${shop.state}` : ''}</p><p
                    className="mt-2 text-xs text-[#8a928e]">{shop.review_count || 0} reviews{shop.is_verified ? ' · Verified shop' : ''}</p>
                </article>)}{!shops.length &&
                    <p className="rounded-2xl border border-dashed p-8 text-sm text-[#67716f] md:col-span-3">Shop
                        listings are being added. Create an account to explore as the network grows.</p>}</div>
            </div>
        </section>
        <footer
            className="landing-footer mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-7 text-sm text-[#67716f] sm:px-8">
            <span>Auto Repair Finder · Your repair, your choice</span><Link href="/create-account"
                                                                            className="font-bold text-[#c75324]">Get
            started</Link></footer>
    </main>
}
