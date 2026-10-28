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
    try {const r=await fetch(`/api/sites/${pathSlug}/rsvp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:guestName,attending,message:wish})});if(!r.ok)throw new Error('Unable to save response');setRsvpStatus('Thank you! Your response has been received.');setGuestName('');setWish('');setAttending(null)}catch{setRsvpStatus('Unable to save your response. If you recently submitted, please do not submit again yet.')}finally{setSending(false)}
  }
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
          <div className="hero-visual">
            {(site?.heroImage || (!pathSlug ? "/graduation-hero.jpg" : null)) && <img key={site?.heroImage || "default-hero"} src={site?.heroImage || "/graduation-hero.jpg"} alt={site ? `${site.graduateName} graduation portrait` : "Graduation portrait"} /> }
            <div className="hero-visual-overlay"><span>{site?.eventDate ? `CLASS OF ${new Date(site.eventDate).getUTCFullYear()}` : "THE GRADUATION CELEBRATION"}</span><strong>The next chapter<br/>starts here.</strong></div>
          </div>
          <span className="hero-index">01 / THE CELEBRATION</span>
        </section>

        
        <section className="details-section container" id="details">
          <div className="section-heading"><span className="overline">EVERYTHING YOU NEED TO KNOW</span><h2>The celebration <em>details.</em></h2><p>All the essentials for sharing this special day with us.</p></div>
          <div className="detail-grid">
            <article className="detail-card"><span className="detail-icon"><CalendarDays/></span><span className="detail-number">01 / DATE</span><h3>{site?.eventDate ? new Date(site.eventDate).toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : event.dateLabel || 'To be confirmed'}</h3><p>{site?.eventDate ? 'Save the date and celebrate with us.' : 'The date will be announced here.'}</p></article>
            <article className="detail-card"><span className="detail-icon"><Clock3/></span><span className="detail-number">02 / TIME</span><h3>{site?.eventTime || event.time || 'To be confirmed'}</h3><p>{site?.eventTime ? 'We look forward to seeing you.' : 'The schedule will be shared here.'}</p></article>
            <article className="detail-card"><span className="detail-icon"><MapPin/></span><span className="detail-number">03 / LOCATION</span><h3>{site?.venue || event.venue || 'To be confirmed'}</h3><p>{site?.venue ? 'We look forward to celebrating here.' : 'Location details will be shared here.'}</p></article>
          </div>
        </section>

{pathSlug && site && <section className="rsvp-section container" id="rsvp"><div className="section-heading"><span className="overline">YOU ARE INVITED</span><h2>Will you <em>join us?</em></h2><p>Let {site.graduateName} know whether you'll attend the celebration.</p></div><form className="rsvp-form" onSubmit={submitRsvp}><label htmlFor="guest-name">Your name</label><input id="guest-name" maxLength={120} required value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Your full name"/><span className="rsvp-label">Attendance</span><div className="rsvp-choices"><button type="button" aria-pressed={attending===true} className={attending===true?'selected':''} onClick={()=>setAttending(true)}>I'll attend</button><button type="button" aria-pressed={attending===false} className={attending===false?'selected':''} onClick={()=>setAttending(false)}>I can't attend</button></div><label htmlFor="guest-wish">A message for the graduate (optional)</label><textarea id="guest-wish" value={wish} onChange={e=>setWish(e.target.value)} maxLength={1200} rows={3} placeholder="Send your congratulations or best wishes"/><p className="rsvp-privacy">Your name, attendance choice and message will be shared with the graduation website administrator.</p><input name="website" className="rsvp-honeypot" autoComplete="off" tabIndex={-1} aria-hidden="true"/><button className="button primary" type="submit" disabled={attending===null||sending}>{sending?'Sending…':'Send response'}</button>{rsvpStatus&&<p role="status">{rsvpStatus}</p>}</form></section>}
        <section className="gallery-section container" id="moments"><div className="gallery-intro"><div><span className="overline">OUR FAVORITE MEMORIES</span><h2>Moments that <em>matter.</em></h2></div><p>A glimpse into the journey. Photos will appear here as they're added.</p></div><div className="gallery-grid">{gallery.map(photo => <div className="gallery-photo" key={photo.id || photo.src}><img loading="lazy" src={photo.src} alt={photo.alt || "Graduation memory"} /></div>)}</div>{gallery.length === 0 && <div className="gallery-empty" role="status"><GraduationCap size={30}/><strong>{galleryError ? "Gallery temporarily unavailable" : "Memories are coming soon"}</strong><p>{galleryError ? "Please check back shortly." : "Photos will appear here once they are added."}</p></div>}</section>
      </main>
      <footer className="footer"><div className="container footer-inner"><div className="footer-brand"><GraduationCap size={25}/><strong>THE GRADUATION</strong><span>CELEBRATION</span></div><p>Celebrating milestones. Creating memories.</p><a href="#home">Back to top</a></div><div className="container footer-bottom"><span>© 2026 Graduation Celebration. All rights reserved.</span><span>Made for a moment worth remembering.</span></div></footer>
    </div>
  )
}
export default App
