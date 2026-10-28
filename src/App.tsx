import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Clock3, MapPin, ArrowUpRight, GraduationCap, Menu, X, ChevronLeft, ChevronRight, Pause, Play, Share2, Navigation, Copy, Check, Images, Send, LockKeyhole, Gift, Camera, Heart, Globe2, ShieldCheck } from 'lucide-react'
import './App.css'

const platformContactUrl = 'https://wa.me/255743621712?text=Hello%2C%20I%27m%20interested%20in%20getting%20a%20graduation%20website.'

const event = {
  label: 'THE GRADUATION CELEBRATION',
  // Replace these values with confirmed information before publishing event details.
  dateLabel: '',
  time: '',
  venue: '',
}

type Wish = {guestName:string;message:string;createdAt:string}
type GalleryImage = { id?: string; src: string; alt: string }

function App() {
  const siteBaseDomain = (import.meta.env.VITE_SITES_BASE_DOMAIN || '').trim().toLowerCase()
  const hostname = window.location.hostname.toLowerCase()
  const hostnameSuffix = siteBaseDomain ? `.${siteBaseDomain}` : ''
  const hostSlug = hostnameSuffix && hostname.endsWith(hostnameSuffix)
    ? hostname.slice(0,-hostnameSuffix.length)
    : null
  const pathSlug = window.location.pathname.match(/^\/s\/([a-z0-9-]+)\/?$/)?.[1]
    || (hostSlug && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostSlug) && !['www','admin','app','api'].includes(hostSlug) ? hostSlug : null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [linkCopied,setLinkCopied]=useState(false)
  const [giftCopied,setGiftCopied]=useState(false)
  const [guestName,setGuestName]=useState('')
  const [attending,setAttending]=useState<boolean | null>(null)
  const [wish,setWish]=useState('')
  const [rsvpStatus,setRsvpStatus]=useState('')
  const [sending,setSending]=useState(false)
  const [rsvpDone,setRsvpDone]=useState(false)
  async function submitRsvp(e:FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(!pathSlug || (attending===null&&!wish.trim()))return
    setSending(true);setRsvpStatus('')
    try {const r=await fetch(`/api/sites/${pathSlug}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:guestName,attending,message:wish})});if(!r.ok){const body=await r.json().catch(()=>({}));throw new Error(body.message||'Unable to save response')}setRsvpDone(true);setGuestName('');setWish('');setAttending(null);setWishPage(1)}catch(err){setRsvpStatus(err instanceof Error?err.message:'Unable to save your response.')}finally{setSending(false)}
  }
  const [publicWishes,setPublicWishes]=useState<Wish[]>([])
  const [wishPage,setWishPage]=useState(1)
  const [wishTotal,setWishTotal]=useState(0)
  const [wishPages,setWishPages]=useState(0)
  const [wishesLoading,setWishesLoading]=useState(false)
  const [expandedWishes,setExpandedWishes]=useState<number[]>([])
  const [wishIndex,setWishIndex]=useState(0)
  const [viewAllWishes,setViewAllWishes]=useState(false)
  const [allWishes,setAllWishes]=useState<Wish[]>([])
  const [allWishesPage,setAllWishesPage]=useState(0)
  const [allWishesLoading,setAllWishesLoading]=useState(false)
  const [allWishesError,setAllWishesError]=useState('')
  const [wishPaused,setWishPaused]=useState(false)
  const [wishHover,setWishHover]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(false)
  const [touchStart,setTouchStart]=useState<number|null>(null)
  useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>setReducedMotion(media.matches);sync();media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync)},[])
  useEffect(()=>{if(wishPaused||wishHover||reducedMotion||expandedWishes.length||!publicWishes.length)return;const timer=window.setInterval(()=>setWishIndex(i=>(i+1)%publicWishes.length),6500);return()=>window.clearInterval(timer)},[wishPaused,wishHover,reducedMotion,expandedWishes.length,publicWishes.length])
  useEffect(()=>{
    if(!pathSlug)return
    const controller=new AbortController()
    setWishesLoading(true)
    fetch(`/api/sites/${pathSlug}/wishes?page=${wishPage}`,{signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error('Wishes unavailable');return r.json()})
      .then(data=>{if(Array.isArray(data.items)){setPublicWishes(data.items);setWishTotal(data.total||0);setWishPages(data.totalPages||0);setExpandedWishes([]);setWishIndex(0)}})
      .catch(()=>{})
      .finally(()=>{if(!controller.signal.aborted)setWishesLoading(false)})
    return ()=>controller.abort()
  },[pathSlug,wishPage])
  useEffect(()=>{
    if(!viewAllWishes||!pathSlug||allWishesPage<1)return
    const controller=new AbortController()
    setAllWishesLoading(true)
    setAllWishesError('')
    fetch(`/api/sites/${pathSlug}/wishes?page=${allWishesPage}`,{signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error('Unable to load wishes');return r.json()})
      .then(data=>{if(Array.isArray(data.items))setAllWishes(prev=>allWishesPage===1?data.items:[...prev,...data.items]);else throw new Error('Invalid response')})
      .catch(err=>{if(!controller.signal.aborted)setAllWishesError(err instanceof Error?err.message:'Unable to load wishes')})
      .finally(()=>{if(!controller.signal.aborted)setAllWishesLoading(false)})
    return ()=>controller.abort()
  },[viewAllWishes,pathSlug,allWishesPage])
  function openAllWishes(){setViewAllWishes(true);setWishPaused(true);if(allWishesPage===0)setAllWishesPage(1)}
  function closeAllWishes(){setViewAllWishes(false);setWishPaused(false)}
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [galleryError, setGalleryError] = useState(false)
  const [showAllPhotos,setShowAllPhotos]=useState(false)
  const [activePhoto,setActivePhoto]=useState<number|null>(null)
  const galleryPhotos=gallery.filter((photo,index,all)=>all.findIndex(item=>item.src===photo.src)===index)
  useEffect(()=>{if(activePhoto===null&&!showAllPhotos)return;function onKey(e:KeyboardEvent){if(e.key==='Escape'){setActivePhoto(null);setShowAllPhotos(false)}else if(activePhoto!==null&&e.key==='ArrowRight')setActivePhoto(i=>i===null?null:(i+1)%galleryPhotos.length);else if(activePhoto!==null&&e.key==='ArrowLeft')setActivePhoto(i=>i===null?null:(i+galleryPhotos.length-1)%galleryPhotos.length)}window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[activePhoto,showAllPhotos,galleryPhotos.length])
  const [site, setSite] = useState<{ graduateName: string; eventDate: string | null; eventTime: string | null; venue: string | null; message: string | null; heroImage: string | null; giftPhone:string|null;giftName:string|null;giftProvider:string|null } | null>(null)
  const [siteUnavailable, setSiteUnavailable] = useState(false)
  useEffect(() => {
    fetch(pathSlug ? `/api/sites/${pathSlug}` : '/api/site').then(async r => {
      if (!r.ok) { setSiteUnavailable(true); return }
      const payload = await r.json()
      setSite(payload.site || null)
    }).catch(() => setSiteUnavailable(true))
  }, [])
  useEffect(() => {
    fetch(pathSlug ? `/api/sites/${pathSlug}/gallery` : '/api/gallery')
      .then(r => { if (!r.ok) throw new Error('Gallery unavailable'); return r.json() })
      .then((images: GalleryImage[]) => {
        if (!Array.isArray(images)) throw new Error('Invalid gallery response')
        setGallery(images)
      })
      .catch(() => setGalleryError(true))
  }, [])
  const siteUrl=window.location.href.split('#')[0]
  const shareMessage=site ? `Join us in celebrating ${site.graduateName}'s graduation! ${siteUrl}` : `Join our graduation celebration! ${siteUrl}`
  const whatsAppUrl=`https://wa.me/?text=${encodeURIComponent(shareMessage)}`
  const venueUrl=site?.venue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.venue)}` : null
  const calendarUrl=site?.eventDate ? (()=>{
    const date=site.eventDate.slice(0,10).replaceAll('-','')
    const next=new Date(`${site.eventDate.slice(0,10)}T00:00:00Z`)
    if(!/^\d{8}$/.test(date)||Number.isNaN(next.getTime()))return null
    next.setUTCDate(next.getUTCDate()+1)
    const end=next.toISOString().slice(0,10).replaceAll('-','')
    const qs=new URLSearchParams({action:'TEMPLATE',text:`${site.graduateName} - Graduation Celebration`,dates:`${date}/${end}`,details:`Graduation celebration. For confirmed timing, see: ${siteUrl}`,location:site.venue||'',ctz:'Africa/Dar_es_Salaam'})
    return `https://calendar.google.com/calendar/render?${qs.toString()}`
  })() : null
  async function copySiteLink(){try{await navigator.clipboard.writeText(siteUrl);setLinkCopied(true);window.setTimeout(()=>setLinkCopied(false),2200)}catch{setLinkCopied(false)}}
  if (!pathSlug) return (
    <div className="site-shell platform-site">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Graduation websites home"><span className="brand-icon"><GraduationCap size={23}/></span><span>THE <strong>GRADUATION</strong><small>CELEBRATION</small></span></a>
        <button className="mobile-menu" onClick={()=>setMenuOpen(v=>!v)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen?<X/>:<Menu/>}</button>
        <nav className={menuOpen?'nav open':'nav'} aria-label="Main navigation">
          <a href="#features" onClick={()=>setMenuOpen(false)}>Features</a>
          <a href="#how-it-works" onClick={()=>setMenuOpen(false)}>How it works</a>
          <a href="#contact" onClick={()=>setMenuOpen(false)}>Contact</a>
          <a className="nav-cta" href={platformContactUrl} target="_blank" rel="noopener noreferrer" onClick={()=>setMenuOpen(false)}>Get Your Website <ArrowUpRight size={15}/></a>
        </nav>
      </header>
      <main>
        <section className="platform-hero" id="home">
          <div className="platform-hero-copy">
            <span className="overline">PERSONALIZED GRADUATION WEBSITES</span>
            <h1>Your milestone.<br/><em>Your story.</em><br/>Beautifully told.</h1>
            <p>Turn your graduation into a beautiful online celebration. Share your moments, invite your loved ones, and collect heartfelt wishes—all in one personal website.</p>
            <div className="platform-hero-actions"><a className="button primary" href={platformContactUrl} target="_blank" rel="noopener noreferrer">Get Your Graduation Website <ArrowUpRight size={17}/></a><a className="platform-secondary-link" href="#features">Explore features <ArrowUpRight size={15}/></a></div>
            <div className="platform-trust"><span><Check size={15}/> Personalized for you</span><span><Check size={15}/> Easy to share</span><span><Check size={15}/> Mobile-friendly</span></div>
          </div>
          <div className="platform-hero-art"><div className="platform-art-emblem" aria-hidden="true"><span className="platform-art-ring"/><GraduationCap size={120} strokeWidth={0.95}/><span className="platform-art-year">A NEW CHAPTER</span></div><div className="platform-art-note"><span>A MOMENT TO REMEMBER</span><strong>Every achievement<br/>deserves a celebration.</strong></div></div>
        </section>
        <section className="platform-features container" id="features">
          <div className="section-heading"><span className="overline">THOUGHTFULLY DESIGNED</span><h2>Everything you need, <em>beautifully simple.</em></h2><p>One memorable link to bring your graduation celebration together.</p></div>
          <div className="platform-feature-grid">
            <article><span className="platform-feature-icon"><Globe2 size={23}/></span><h3>Your own website</h3><p>A personalized space for your name, story, and special day.</p></article>
            <article><span className="platform-feature-icon"><Camera size={23}/></span><h3>Photo gallery</h3><p>Showcase favorite memories with thoughtful photo captions.</p></article>
            <article><span className="platform-feature-icon"><CalendarDays size={23}/></span><h3>Guest RSVP</h3><p>Make it easy for loved ones to confirm attendance.</p></article>
            <article><span className="platform-feature-icon"><Heart size={23}/></span><h3>Heartfelt wishes</h3><p>Collect messages of love and congratulations in one place.</p></article>
          </div>
        </section>
        <section className="platform-process container" id="how-it-works">
          <div><span className="overline">SIMPLE FROM THE START</span><h2>From your story<br/>to your <em>celebration.</em></h2><p>No complicated setup for you or your guests.</p></div>
          <div className="platform-steps"><div><span>01</span><strong>Get in touch</strong><p>Tell us about your graduation and the details you'd like to share.</p></div><div><span>02</span><strong>Make it yours</strong><p>We prepare your personalized website with your photos and event information.</p></div><div><span>03</span><strong>Share the moment</strong><p>Send your link to family and friends to RSVP and leave their wishes.</p></div></div>
        </section>
        <section className="platform-contact container" id="contact"><div className="platform-contact-inner"><div><span className="overline">READY TO CELEBRATE?</span><h2>Your graduation deserves <em>something special.</em></h2><p>Let's create a beautiful place for your milestone and the people celebrating with you.</p><div className="platform-contact-phone"><ShieldCheck size={16}/> Enquiries: 0743 621 712</div></div><a href={platformContactUrl} target="_blank" rel="noopener noreferrer" className="platform-contact-action">Chat on WhatsApp <ArrowUpRight size={17}/><span>Let's create your website</span></a></div></section>
      </main>
      <footer className="footer"><div className="container footer-inner"><div className="footer-brand"><GraduationCap size={25}/><strong>THE GRADUATION</strong><span>CELEBRATION</span></div><p>Beautifully celebrating every milestone.</p><a href="#home">Back to top</a></div><div className="container footer-bottom"><span>© 2026 Graduation Celebration.</span><span>Made for moments worth remembering.</span></div></footer>
    </div>
  )
  if (siteUnavailable) return <div className="site-unavailable"><GraduationCap size={44}/><h1>This graduation website is not available.</h1><p>Please contact the organizer.</p></div>
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Graduation home"><span className="brand-icon"><GraduationCap size={23}/></span><span>THE <strong>GRADUATION</strong><small>CELEBRATION</small></span></a>
        <button className="mobile-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X/> : <Menu/>}</button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
          <a onClick={() => setMenuOpen(false)} href="#home">Home</a>
          <a onClick={() => setMenuOpen(false)} href="#details">Event Info</a>
          {pathSlug && <a onClick={() => setMenuOpen(false)} href="#wishes">Wishes</a>}
          <a onClick={() => setMenuOpen(false)} href="#moments">Gallery</a>
          <a className="nav-cta" onClick={() => setMenuOpen(false)} href={pathSlug ? "#rsvp" : platformContactUrl} {...(!pathSlug ? {target:"_blank",rel:"noopener noreferrer"} : {})}>{pathSlug ? "RSVP" : "Get Your Website"} <ArrowUpRight size={15}/></a>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line"/>{site ? "A DAY WORTH REMEMBERING" : event.label}</div>
            <h1>{site ? site.graduateName : 'A Journey Worth'}<br/><em>{site ? 'Graduation Celebration' : 'Celebrating.'}</em></h1>
            <p>{site?.message || 'A journey of dedication, growth and gratitude. Join us in celebrating this remarkable milestone.'}</p>
            {site?.eventDate && <p className="event-quick-date"><CalendarDays size={17}/> {new Date(site.eventDate).toLocaleDateString("en-TZ",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"})}{site.venue ? ` · ${site.venue}` : ""}</p>}
            <div className="hero-actions"><a className="button primary" href={pathSlug ? "#rsvp" : "#details"}>{pathSlug ? "Confirm Attendance" : "Discover the Celebration"} <ArrowUpRight size={18}/></a><a className="text-link" href="#moments">View moments</a></div>
            {pathSlug && site && <div className="guest-quick-actions" aria-label="Share and event tools"><a href={whatsAppUrl} target="_blank" rel="noopener noreferrer"><Share2 size={17}/> Share on WhatsApp</a><button type="button" onClick={()=>void copySiteLink()}>{linkCopied?<Check size={17}/>:<Copy size={17}/>} {linkCopied?'Link copied':'Copy link'}</button>{calendarUrl&&<a href={calendarUrl} target="_blank" rel="noopener noreferrer"><CalendarDays size={17}/> Add to calendar</a>}{venueUrl&&<a href={venueUrl} target="_blank" rel="noopener noreferrer"><Navigation size={17}/> Directions</a>}</div>}
            <div className="hero-foot"><span className="small-dot"/> A milestone to cherish. A future to celebrate.</div>
          </div>
          <div className="hero-visual"><div className="hero-photo-frame" aria-hidden="true" />
            {(site?.heroImage || (!pathSlug ? "/graduation-hero.jpg" : null)) && <img key={site?.heroImage || "default-hero"} src={site?.heroImage || "/graduation-hero.jpg"} alt={site ? `${site.graduateName} graduation portrait` : "Graduation portrait"} /> }
            <div className="hero-visual-overlay"><span>{site?.eventDate ? `CLASS OF ${new Date(site.eventDate).getUTCFullYear()}` : "THE GRADUATION CELEBRATION"}</span><strong>The next chapter<br/>starts here.</strong></div>
          </div>
          <span className="hero-index">01 / THE CELEBRATION</span>
        </section>

        
        <section className="details-section container" id="details">
          <div className="section-heading"><span className="overline">CELEBRATE WITH US</span><h2>The special <em>day.</em></h2><p>The details for the graduation celebration.</p></div>
          <div className="detail-grid">
            <article className="detail-card"><span className="detail-icon"><CalendarDays size={22}/></span><div className="detail-copy"><span className="detail-number">CEREMONY DATE</span><h3>{site?.eventDate ? new Date(site.eventDate).toLocaleDateString('en-TZ', { weekday:'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Date to be announced'}</h3><p>Mark your calendar for this special occasion.</p></div></article>
            {(site?.eventTime || !pathSlug) && <article className="detail-card"><span className="detail-icon"><Clock3 size={22}/></span><div className="detail-copy"><span className="detail-number">STARTING TIME</span><h3>{site?.eventTime || 'Time to be announced'}</h3><p>Plan to arrive a little early.</p></div></article>}
            <article className="detail-card"><span className="detail-icon"><MapPin size={22}/></span><div className="detail-copy"><span className="detail-number">VENUE</span><h3>{site?.venue || 'Venue to be announced'}</h3>{site?.venue && <a className="detail-map-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.venue)}`} target="_blank" rel="noopener noreferrer">Find on Google Maps <ArrowUpRight size={14}/></a>}{!site?.venue&&<p>Location details will be shared soon.</p>}</div></article>
          </div>
        </section>

{pathSlug && site && <section className="gifts-section container" id="gifts" aria-labelledby="gifts-heading"><div className="gifts-inner"><span className="gifts-icon"><Gift size={24} strokeWidth={1.7}/></span><div className="gifts-copy"><span className="overline">A THOUGHTFUL GESTURE</span><h2 id="gifts-heading">Gifts &amp; <em>kind wishes.</em></h2><p>Your presence and heartfelt wishes are more than enough. If you'd like to send a gift to {site.graduateName}, it will be warmly appreciated—but never expected.</p>{site.giftPhone&&<div className="gift-payment"><span>{site.giftProvider||'GIFT CONTACT'}{site.giftName?` · ${site.giftName}`:''}</span><strong>{site.giftPhone}</strong><button type="button" onClick={()=>{void navigator.clipboard.writeText(site.giftPhone||'').then(()=>{setGiftCopied(true);window.setTimeout(()=>setGiftCopied(false),2000)}).catch(()=>setGiftCopied(false))}}>{giftCopied?<Check size={15}/>:<Copy size={15}/>} {giftCopied?'Copied':'Copy number'}</button></div>}</div><a className="gifts-action" href="#rsvp">Leave a heartfelt wish <ArrowUpRight size={16}/></a></div></section>}
        {pathSlug && site && <section className="rsvp-section container" id="rsvp"><div className="section-heading"><span className="overline">YOU ARE INVITED</span><h2>Will you <em>join us?</em></h2><p>Celebrate with {site.graduateName} or leave a special message.</p></div>{rsvpDone?<div className="rsvp-form rsvp-thanks" role="status"><Check size={32}/><h3>Thank you for your message!</h3><p>Your response has been received.</p><button type="button" className="button primary" onClick={()=>setRsvpDone(false)}>Send another message</button></div>:<form className="rsvp-form" onSubmit={submitRsvp}><label htmlFor="guest-name">Your full name</label><input id="guest-name" maxLength={120} required value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Enter your name"/><span className="rsvp-label">Will you attend? <small>(optional if sending wishes only)</small></span><div className="rsvp-choices"><button type="button" aria-pressed={attending===true} className={attending===true?'selected':''} onClick={()=>setAttending(true)}>{attending===true&&<Check size={16}/>} I'll attend</button><button type="button" aria-pressed={attending===false} className={attending===false?'selected':''} onClick={()=>setAttending(false)}>{attending===false&&<Check size={16}/>} Can't attend</button></div><label htmlFor="guest-wish">Leave a congratulatory message <small>(optional with RSVP)</small></label><textarea id="guest-wish" value={wish} onChange={e=>setWish(e.target.value)} maxLength={1200} rows={3} placeholder={`Write something special for ${site.graduateName}…`}/><p className="rsvp-privacy"><LockKeyhole size={15}/> Attendance stays private. Your name and message will be publicly visible.</p><input name="website" className="rsvp-honeypot" autoComplete="off" tabIndex={-1} aria-hidden="true"/>{rsvpStatus&&<p className="admin-error" role="alert">{rsvpStatus}</p>}<button className="button primary" type="submit" disabled={(attending===null&&!wish.trim())||sending}><Send size={16}/>{sending?'Sending…':attending===null?'Send wishes only':'Send my response'}</button></form>}</section>}
        {pathSlug && site && <section className="wishes-section container" id="wishes">
          <div className="section-heading"><span className="overline">WORDS OF CELEBRATION</span><h2>Heartfelt <em>wishes.</em></h2><p>Kind words shared with {site.graduateName}.{wishTotal>0 && ` ${wishTotal} messages.`}</p></div>
          {publicWishes.length ? <div className="wishes-carousel" onMouseEnter={()=>setWishHover(true)} onMouseLeave={()=>setWishHover(false)} onFocusCapture={()=>setWishHover(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setWishHover(false)}} onTouchStart={e=>setTouchStart(e.touches[0].clientX)} onTouchEnd={e=>{if(touchStart!==null){const dx=e.changedTouches[0].clientX-touchStart;if(Math.abs(dx)>45)setWishIndex(i=>(i+(dx<0?1:publicWishes.length-1))%publicWishes.length)}setTouchStart(null)}}>
            <div className="wishes-slider-viewport"><div className="wishes-slider-track" style={{transform:`translateX(-${wishIndex*100}%)`}}>{publicWishes.map((w,i)=><div className="wish-slide" key={w.createdAt+w.guestName+i}><blockquote className="wish-card"><p>{expandedWishes.includes(i)||w.message.length<=230?w.message:w.message.slice(0,230).trimEnd()+'…'}</p>{w.message.length>230&&<button type="button" className="wish-expand" onClick={()=>setExpandedWishes(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i])}>{expandedWishes.includes(i)?'Read less':'Read more'}</button>}<footer>{w.guestName}</footer></blockquote></div>)}</div></div>
            <div className="wishes-controls"><div className="wishes-counter">{wishIndex+1} of {publicWishes.length} on this page</div><div className="wishes-control-buttons"><button type="button" aria-label="Previous wish" onClick={()=>setWishIndex(i=>(i+publicWishes.length-1)%publicWishes.length)}><ChevronLeft size={18}/></button><button type="button" aria-label={wishPaused?'Resume automatic wishes':'Pause automatic wishes'} onClick={()=>setWishPaused(v=>!v)}>{wishPaused?<Play size={17}/>:<Pause size={17}/>}</button><button type="button" aria-label="Next wish" onClick={()=>setWishIndex(i=>(i+1)%publicWishes.length)}><ChevronRight size={18}/></button></div></div>
          </div>:<p className="wishes-empty">{wishesLoading?'Loading wishes…':'Be the first to share your congratulations.'}</p>}
          {wishTotal>0&&<div className="wishes-view-all"><button type="button" onClick={openAllWishes}>View all {wishTotal} wishes <ArrowUpRight size={16}/></button></div>}
          {viewAllWishes&&<div className="wishes-all-overlay" role="presentation" onClick={closeAllWishes}><section className="wishes-all-panel" role="dialog" aria-modal="true" aria-label="All graduation wishes" onClick={e=>e.stopPropagation()}><header><div><span className="overline">MESSAGES OF CELEBRATION</span><h3>All wishes <small>({wishTotal})</small></h3></div><button type="button" aria-label="Close all wishes" onClick={closeAllWishes}><X size={21}/></button></header><div className="wishes-all-content">{allWishes.map((w,i)=><article className="all-wish-item" key={w.createdAt+w.guestName+i}><p>{w.message}</p><strong>{w.guestName}</strong></article>)}{allWishesLoading&&<p className="wishes-all-state" role="status">Loading wishes…</p>}{allWishesError&&<p className="wishes-all-state" role="alert">{allWishesError} <button type="button" onClick={()=>{setAllWishesPage(0);setAllWishes([]);setTimeout(()=>setAllWishesPage(1),0)}}>Try again</button></p>}{!allWishesLoading&&!allWishesError&&allWishesPage<wishPages&&<button className="wishes-load-more" type="button" onClick={()=>setAllWishesPage(p=>p+1)}>Load more wishes</button>}</div></section></div>}
          {wishPages>1&&<div className="wishes-pagination"><button type="button" disabled={wishPage===1||wishesLoading} onClick={()=>setWishPage(p=>p-1)}>Older page</button><span>Page {wishPage} of {wishPages}</span><button type="button" disabled={wishPage>=wishPages||wishesLoading} onClick={()=>setWishPage(p=>p+1)}>More wishes</button></div>}
        </section>}
                <section className="gallery-section container" id="moments">
          <div className="gallery-intro"><div><span className="overline">OUR FAVORITE MEMORIES</span><h2>Moments that <em>matter.</em></h2></div><p>A collection of beautiful moments, unforgettable memories, and milestones worth celebrating.</p></div>
          {galleryPhotos.length>0&&<><div className="gallery-grid gallery-preview">{galleryPhotos.slice(0,6).map((photo,i)=><button className="gallery-photo" type="button" key={photo.id||photo.src} onClick={()=>setActivePhoto(i)} aria-label={`View photo ${i+1} of ${galleryPhotos.length}`}><img loading="lazy" src={photo.src} alt={photo.alt||'Graduation memory'}/><span className="gallery-photo-overlay"><span className="gallery-photo-label">{photo.alt && photo.alt!=="Graduation memory" ? photo.alt : "View photo"}</span><Images size={18}/></span></button>)}</div>{galleryPhotos.length>6&&<div className="gallery-more"><button type="button" onClick={()=>setShowAllPhotos(true)}>View all {galleryPhotos.length} photos <ArrowUpRight size={16}/></button></div>}</>}
          {galleryPhotos.length===0&&<div className="gallery-empty" role="status"><GraduationCap size={30}/><strong>{galleryError?'Gallery temporarily unavailable':'Memories are coming soon'}</strong><p>{galleryError?'Please check back shortly.':'Photos will appear here once they are added.'}</p></div>}
          {showAllPhotos&&<div className="gallery-dialog-backdrop" onClick={()=>setShowAllPhotos(false)}><section className="gallery-dialog" role="dialog" aria-modal="true" aria-label="All graduation photos" onClick={e=>e.stopPropagation()}><div className="gallery-dialog-header"><div><span className="overline">PHOTO COLLECTION</span><h3>All memories <small>({galleryPhotos.length})</small></h3></div><button type="button" onClick={()=>setShowAllPhotos(false)} aria-label="Close gallery"><X size={22}/></button></div><div className="gallery-dialog-grid">{galleryPhotos.map((photo,i)=><button type="button" className="gallery-dialog-photo" key={photo.id||photo.src} onClick={()=>setActivePhoto(i)} aria-label={`Enlarge photo ${i+1}${photo.alt ? `: ${photo.alt}` : ""}`}><img loading="lazy" src={photo.src} alt={photo.alt||'Graduation memory'}/><span className="gallery-dialog-caption">{photo.alt && photo.alt !== "Graduation memory" ? photo.alt : "View photo"}</span></button>)}</div></section></div>}
          {activePhoto!==null&&galleryPhotos[activePhoto]&&<div className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={()=>setActivePhoto(null)}><button className="photo-lightbox-close" type="button" onClick={()=>setActivePhoto(null)} aria-label="Close photo"><X size={24}/></button><button className="photo-lightbox-arrow" type="button" aria-label="Previous photo" onClick={e=>{e.stopPropagation();setActivePhoto(i=>i===null?null:(i+galleryPhotos.length-1)%galleryPhotos.length)}}><ChevronLeft size={24}/></button><figure onClick={e=>e.stopPropagation()}><img src={galleryPhotos[activePhoto].src} alt={galleryPhotos[activePhoto].alt||'Graduation memory'}/><figcaption><span className="photo-lightbox-count">{activePhoto+1} / {galleryPhotos.length}</span>{galleryPhotos[activePhoto].alt && galleryPhotos[activePhoto].alt!=="Graduation memory" && <span className="photo-lightbox-caption">{galleryPhotos[activePhoto].alt}</span>}</figcaption></figure><button className="photo-lightbox-arrow" type="button" aria-label="Next photo" onClick={e=>{e.stopPropagation();setActivePhoto(i=>i===null?null:(i+1)%galleryPhotos.length)}}><ChevronRight size={24}/></button></div>}
        </section>
        {!pathSlug && <section className="platform-contact container" aria-labelledby="platform-contact-title"><div className="platform-contact-inner"><div><span className="overline">YOUR CELEBRATION, YOUR WEBSITE</span><h2 id="platform-contact-title">Create your own <em>graduation website.</em></h2><p>Celebrate your milestone with a personalized website, gallery, RSVP, and heartfelt wishes.</p></div><a href={platformContactUrl} target="_blank" rel="noopener noreferrer" className="platform-contact-action">Contact us on WhatsApp <ArrowUpRight size={17}/><span>0743 621 712</span></a></div></section>}
      </main>
      <footer className="footer"><div className="container footer-inner"><div className="footer-brand"><GraduationCap size={25}/><strong>THE GRADUATION</strong><span>CELEBRATION</span></div><p>Celebrating milestones. Creating memories.</p><a href="#home">Back to top</a></div><div className="container footer-bottom"><span>© 2026 Graduation Celebration. All rights reserved.</span><span>Made for a moment worth remembering.</span></div></footer>
    </div>
  )
}
export default App
