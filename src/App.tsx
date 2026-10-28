import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Clock3, MapPin, ArrowUpRight, GraduationCap, Menu, X } from 'lucide-react'
import './App.css'

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
  const pathSlug = window.location.pathname.match(/^\/s\/([a-z0-9-]+)\/?$/)?.[1] || null
  const [menuOpen, setMenuOpen] = useState(false)
  const [guestName,setGuestName]=useState('')
  const [attending,setAttending]=useState<boolean | null>(null)
  const [wish,setWish]=useState('')
  const [rsvpStatus,setRsvpStatus]=useState('')
  const [sending,setSending]=useState(false)
  async function submitRsvp(e:FormEvent<HTMLFormElement>){
    e.preventDefault()
    if(!pathSlug || attending===null)return
    setSending(true);setRsvpStatus('')
    try {const r=await fetch(`/api/sites/${pathSlug}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:guestName,attending,message:wish})});if(!r.ok)throw new Error('Unable to save response');setRsvpStatus('Thank you! Your response has been received.');setGuestName('');setWish('');setAttending(null);setWishPage(1)}catch{setRsvpStatus('Unable to save your response. If you recently submitted, please do not submit again yet.')}finally{setSending(false)}
  }
  const [publicWishes,setPublicWishes]=useState<Wish[]>([])
  const [wishPage,setWishPage]=useState(1)
  const [wishTotal,setWishTotal]=useState(0)
  const [wishPages,setWishPages]=useState(0)
  const [wishesLoading,setWishesLoading]=useState(false)
  const [expandedWishes,setExpandedWishes]=useState<number[]>([])
  useEffect(()=>{
    if(!pathSlug)return
    const controller=new AbortController()
    setWishesLoading(true)
    fetch(`/api/sites/${pathSlug}/wishes?page=${wishPage}`,{signal:controller.signal})
      .then(r=>{if(!r.ok)throw new Error('Wishes unavailable');return r.json()})
      .then(data=>{if(Array.isArray(data.items)){setPublicWishes(data.items);setWishTotal(data.total||0);setWishPages(data.totalPages||0);setExpandedWishes([])}})
      .catch(()=>{})
      .finally(()=>{if(!controller.signal.aborted)setWishesLoading(false)})
    return ()=>controller.abort()
  },[pathSlug,wishPage])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [galleryError, setGalleryError] = useState(false)
  const [site, setSite] = useState<{ graduateName: string; eventDate: string | null; eventTime: string | null; venue: string | null; message: string | null; heroImage: string | null } | null>(null)
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
          <a className="nav-cta" onClick={() => setMenuOpen(false)} href={pathSlug ? "#rsvp" : "#details"}>{pathSlug ? "RSVP" : "Explore Event"} <ArrowUpRight size={15}/></a>
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
            <div className="hero-foot"><span className="small-dot"/> A milestone to cherish. A future to celebrate.</div>
          </div>
          <div className="hero-visual"><div className="hero-photo-frame" aria-hidden="true" />
            {(site?.heroImage || (!pathSlug ? "/graduation-hero.jpg" : null)) && <img key={site?.heroImage || "default-hero"} src={site?.heroImage || "/graduation-hero.jpg"} alt={site ? `${site.graduateName} graduation portrait` : "Graduation portrait"} /> }
            <div className="hero-visual-overlay"><span>{site?.eventDate ? `CLASS OF ${new Date(site.eventDate).getUTCFullYear()}` : "THE GRADUATION CELEBRATION"}</span><strong>The next chapter<br/>starts here.</strong></div>
          </div>
          <span className="hero-index">01 / THE CELEBRATION</span>
        </section>

        
        <section className="details-section container" id="details">
          <div className="section-heading"><span className="overline">CELEBRATE WITH US</span><h2>The special <em>day.</em></h2><p>Here is everything you need to join the celebration.</p></div>
          <div className="detail-grid">
            <article className="detail-card"><span className="detail-icon"><CalendarDays size={22}/></span><div className="detail-copy"><span className="detail-number">CEREMONY DATE</span><h3>{site?.eventDate ? new Date(site.eventDate).toLocaleDateString('en-TZ', { weekday:'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Date to be announced'}</h3><p>A day to celebrate a wonderful achievement.</p></div></article>
            {(site?.eventTime || !pathSlug) && <article className="detail-card"><span className="detail-icon"><Clock3 size={22}/></span><div className="detail-copy"><span className="detail-number">STARTING TIME</span><h3>{site?.eventTime || 'Time to be announced'}</h3><p>We look forward to seeing you.</p></div></article>}
            <article className="detail-card"><span className="detail-icon"><MapPin size={22}/></span><div className="detail-copy"><span className="detail-number">VENUE</span><h3>{site?.venue || 'Venue to be announced'}</h3><p>We cannot wait to celebrate together.</p></div></article>
          </div>
        </section>

{pathSlug && site && <section className="rsvp-section container" id="rsvp"><div className="section-heading"><span className="overline">YOU ARE INVITED</span><h2>Will you <em>join us?</em></h2><p>Let {site.graduateName} know whether you'll attend the celebration.</p></div><form className="rsvp-form" onSubmit={submitRsvp}><label htmlFor="guest-name">Your name</label><input id="guest-name" maxLength={120} required value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Your full name"/><span className="rsvp-label">Attendance</span><div className="rsvp-choices"><button type="button" aria-pressed={attending===true} className={attending===true?'selected':''} onClick={()=>setAttending(true)}>I'll attend</button><button type="button" aria-pressed={attending===false} className={attending===false?'selected':''} onClick={()=>setAttending(false)}>I can't attend</button></div><label htmlFor="guest-wish">A message for the graduate (optional)</label><textarea id="guest-wish" value={wish} onChange={e=>setWish(e.target.value)} maxLength={1200} rows={3} placeholder="Send your congratulations or best wishes"/><p className="rsvp-privacy">Your attendance choice stays private. Your name and message will be displayed publicly unless removed by the administrator.</p><input name="website" className="rsvp-honeypot" autoComplete="off" tabIndex={-1} aria-hidden="true"/><button className="button primary" type="submit" disabled={attending===null||sending}>{sending?'Sending…':'Send response'}</button>{rsvpStatus&&<p role="status">{rsvpStatus}</p>}</form></section>}
        {pathSlug && site && <section className="wishes-section container" id="wishes">
          <div className="section-heading"><span className="overline">WORDS OF CELEBRATION</span><h2>Heartfelt <em>wishes.</em></h2><p>Kind words shared with {site.graduateName}.{wishTotal>0 && ` ${wishTotal} messages.`}</p></div>
          {publicWishes.length ? <div className="wishes-grid">{publicWishes.map((w,i)=><blockquote className="wish-card" key={w.createdAt + w.guestName}><p>{expandedWishes.includes(i)||w.message.length<=230?w.message:w.message.slice(0,230).trimEnd()+'…'}</p>{w.message.length>230&&<button type="button" className="wish-expand" onClick={()=>setExpandedWishes(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i])}>{expandedWishes.includes(i)?'Read less':'Read more'}</button>}<footer>{w.guestName}</footer></blockquote>)}</div>:<p className="wishes-empty">{wishesLoading?'Loading wishes…':'Be the first to share your congratulations.'}</p>}
          {wishPages>1&&<div className="wishes-pagination"><button type="button" disabled={wishPage===1||wishesLoading} onClick={()=>setWishPage(p=>p-1)}>Previous</button><span>Page {wishPage} of {wishPages}</span><button type="button" disabled={wishPage>=wishPages||wishesLoading} onClick={()=>setWishPage(p=>p+1)}>Next</button></div>}
        </section>}
                <section className="gallery-section container" id="moments"><div className="gallery-intro"><div><span className="overline">OUR FAVORITE MEMORIES</span><h2>Moments that <em>matter.</em></h2></div><p>A glimpse into the journey. Photos will appear here as they're added.</p></div><div className="gallery-grid">{gallery.map(photo => <div className="gallery-photo" key={photo.id || photo.src}><img loading="lazy" src={photo.src} alt={photo.alt || "Graduation memory"} /></div>)}</div>{gallery.length === 0 && <div className="gallery-empty" role="status"><GraduationCap size={30}/><strong>{galleryError ? "Gallery temporarily unavailable" : "Memories are coming soon"}</strong><p>{galleryError ? "Please check back shortly." : "Photos will appear here once they are added."}</p></div>}</section>
      </main>
      <footer className="footer"><div className="container footer-inner"><div className="footer-brand"><GraduationCap size={25}/><strong>THE GRADUATION</strong><span>CELEBRATION</span></div><p>Celebrating milestones. Creating memories.</p><a href="#home">Back to top</a></div><div className="container footer-bottom"><span>© 2026 Graduation Celebration. All rights reserved.</span><span>Made for a moment worth remembering.</span></div></footer>
    </div>
  )
}
export default App
