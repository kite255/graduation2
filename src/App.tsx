import { useEffect, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [galleryError, setGalleryError] = useState(false)
  const [site, setSite] = useState<{ graduateName: string; eventDate: string | null; eventTime: string | null; venue: string | null; message: string | null } | null>(null)
  const [siteUnavailable, setSiteUnavailable] = useState(false)
  useEffect(() => {
    fetch('/api/site').then(async r => {
      if (!r.ok) { setSiteUnavailable(true); return }
      const payload = await r.json()
      setSite(payload.site || null)
    }).catch(() => setSiteUnavailable(true))
  }, [])
  useEffect(() => {
    fetch('/api/gallery')
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
          <a className="nav-cta" onClick={() => setMenuOpen(false)} href="#details">Explore Event <ArrowUpRight size={15}/></a>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line"/>{event.label}</div>
            <h1>{site ? site.graduateName : 'A Journey Worth'}<br/><em>Celebrating.</em></h1>
            <p>{site?.message || 'Every late night, every challenge, every small victory. It all led to this moment. Join us as we celebrate a remarkable milestone and the beginning of something new.'}</p>
            <div className="hero-actions"><a className="button primary" href="#details">Discover the Celebration <ArrowUpRight size={18}/></a><a className="text-link" href="#moments">View moments <span>↗</span></a></div>
            <div className="hero-foot"><span className="small-dot"/> A special day. A lifetime of memories.</div>
          </div>
          <div className="hero-visual" role="img" aria-label="Graduation celebration visual">
            <img src="/graduation-hero.jpg" alt="Graduation portrait" onError={e => {e.currentTarget.style.display = 'none'}} />
            <div className="hero-visual-overlay"><span>CLASS OF 2026</span><strong>The next chapter<br/>starts here.</strong></div>
          </div>
          <span className="hero-index">01 / THE CELEBRATION</span>
        </section>

        
        <section className="details-section container" id="details">
          <div className="section-heading"><span className="overline">EVERYTHING YOU NEED TO KNOW</span><h2>The celebration <em>details.</em></h2><p>All the essentials for sharing this special day with us.</p></div>
          <div className="detail-grid">
            <article className="detail-card"><span className="detail-icon"><CalendarDays/></span><span className="detail-number">01 / DATE</span><h3>{site?.eventDate ? new Date(site.eventDate).toLocaleDateString('en-TZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : event.dateLabel || 'To be confirmed'}</h3><p>The date will be announced here.</p></article>
            <article className="detail-card"><span className="detail-icon"><Clock3/></span><span className="detail-number">02 / TIME</span><h3>{site?.eventTime || event.time || 'To be confirmed'}</h3><p>The schedule will be shared here.</p></article>
            <article className="detail-card"><span className="detail-icon"><MapPin/></span><span className="detail-number">03 / LOCATION</span><h3>{site?.venue || event.venue || 'To be confirmed'}</h3><p>Location details will be shared here.</p></article>
          </div>
        </section>

        <section className="gallery-section container" id="moments"><div className="gallery-intro"><div><span className="overline">OUR FAVORITE MEMORIES</span><h2>Moments that <em>matter.</em></h2></div><p>A glimpse into the journey. Photos will appear here as they're added.</p></div><div className="gallery-grid">{gallery.map(photo => <div className="gallery-photo" key={photo.id || photo.src}><img loading="lazy" src={photo.src} alt={photo.alt || "Graduation memory"} /></div>)}</div>{gallery.length === 0 && <div className="gallery-empty" role="status"><GraduationCap size={30}/><strong>{galleryError ? "Gallery temporarily unavailable" : "Memories are coming soon"}</strong><p>{galleryError ? "Please check back shortly." : "Photos will appear here once they are added."}</p></div>}</section>
      </main>
      <footer className="footer"><div className="container footer-inner"><div className="footer-brand"><GraduationCap size={25}/><strong>THE GRADUATION</strong><span>CELEBRATION</span></div><p>Celebrating milestones. Creating memories.</p><a href="#home">Back to top ↑</a></div><div className="container footer-bottom"><span>© 2026 Graduation Celebration. All rights reserved.</span><span>Made for a moment worth remembering.</span></div></footer>
    </div>
  )
}
export default App
