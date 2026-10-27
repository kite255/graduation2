import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, MapPin, ArrowUpRight, GraduationCap, Menu, X } from 'lucide-react'
import './App.css'

const event = {
  title: 'A New Chapter Begins',
  label: 'THE GRADUATION CELEBRATION',
  date: '2026-12-12T10:00:00+03:00', // Demo date: replace with actual ceremony date.
  dateLabel: 'Saturday, 12 December 2026',
  time: '10:00 AM EAT',
  venue: 'Venue to be announced',
}

const photos = [
  { src: '/gallery-1.jpg', alt: 'Graduation celebration memories' },
  { src: '/gallery-2.jpg', alt: 'Graduates celebrating together' },
  { src: '/gallery-3.jpg', alt: 'A memorable graduation moment' },
]

function remaining() {
  const diff = Math.max(0, new Date(event.date).getTime() - Date.now())
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function App() {
  const [time, setTime] = useState(remaining)
  const [menuOpen, setMenuOpen] = useState(false)
  const [gallery, setGallery] = useState(photos)
  useEffect(() => {
    fetch('/api/gallery')
      .then(r => { if (!r.ok) throw new Error('Gallery unavailable'); return r.json() })
      .then((images: {src: string; alt: string}[]) => {
        if (images.length) setGallery(images)
      })
      .catch(() => {}) // Keep demo placeholders until the API is configured.
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setTime(remaining()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Graduation home"><span className="brand-icon"><GraduationCap size={23}/></span><span>THE <strong>GRADUATION</strong><small>CELEBRATION</small></span></a>
        <button className="mobile-menu" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>{menuOpen ? <X/> : <Menu/>}</button>
        <nav className={menuOpen ? 'nav open' : 'nav'} aria-label="Main navigation">
          <a onClick={() => setMenuOpen(false)} href="#home">Home</a>
          <a onClick={() => setMenuOpen(false)} href="#details">Event Details</a>
          <a onClick={() => setMenuOpen(false)} href="#moments">Gallery</a>
          <a className="nav-cta" onClick={() => setMenuOpen(false)} href="#details">Explore Event <ArrowUpRight size={15}/></a>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <div className="eyebrow"><span className="eyebrow-line"/>{event.label}</div>
            <h1>A Journey Worth<br/><em>Celebrating.</em></h1>
            <p>Every late night, every challenge, every small victory. It all led to this moment. Join us as we celebrate a remarkable milestone and the beginning of something new.</p>
            <div className="hero-actions"><a className="button primary" href="#details">Discover the Celebration <ArrowUpRight size={18}/></a><a className="text-link" href="#moments">View moments <span>↗</span></a></div>
            <div className="hero-foot"><span className="small-dot"/> A special day. A lifetime of memories.</div>
          </div>
          <div className="hero-visual" role="img" aria-label="Graduation celebration visual">
            <img src="/graduation-hero.jpg" alt="Graduation portrait" onError={e => {e.currentTarget.style.display = 'none'}} />
            <div className="hero-visual-overlay"><span>CLASS OF 2026</span><strong>The next chapter<br/>starts here.</strong></div>
          </div>
          <span className="hero-index">01 / THE CELEBRATION</span>
        </section>

        <section className="countdown-section" aria-label="Countdown to graduation">
          <div className="countdown-heading"><span className="overline light">MARK YOUR CALENDAR</span><h2>Counting down to<br/><em>our big day.</em></h2></div>
          <div className="countdown-cells">{Object.entries(time).map(([key, value]) => <div className="countdown-cell" key={key}><strong>{String(value).padStart(2, '0')}</strong><span>{key}</span></div>)}</div>
        </section>

        <section className="details-section container" id="details">
          <div className="section-heading"><span className="overline">EVERYTHING YOU NEED TO KNOW</span><h2>The celebration <em>details.</em></h2><p>All the essentials for sharing this special day with us.</p></div>
          <div className="detail-grid">
            <article className="detail-card"><span className="detail-icon"><CalendarDays/></span><span className="detail-number">01 / DATE</span><h3>{event.dateLabel}</h3><p>Save the date for a day to remember.</p></article>
            <article className="detail-card"><span className="detail-icon"><Clock3/></span><span className="detail-number">02 / TIME</span><h3>{event.time}</h3><p>We look forward to celebrating together.</p></article>
            <article className="detail-card"><span className="detail-icon"><MapPin/></span><span className="detail-number">03 / LOCATION</span><h3>{event.venue}</h3><p>Venue and directions will be shared here.</p></article>
          </div>
        </section>

        <section className="message-band"><div className="container message-content"><span className="overline light">A MOMENT TO REMEMBER</span><h2>Behind every achievement is a story of <em>perseverance, growth, and gratitude.</em></h2><p>Thank you to everyone who has been part of this journey.</p></div></section>

        <section className="gallery-section container" id="moments"><div className="gallery-intro"><div><span className="overline">OUR FAVORITE MEMORIES</span><h2>Moments that <em>matter.</em></h2></div><p>A glimpse into the journey. Photos will appear here as they're added.</p></div><div className="gallery-grid">{gallery.map((photo, i) => <div className="gallery-photo" key={photo.src}><img src={photo.src} alt={photo.alt} onError={e => {e.currentTarget.style.display = 'none'}}/><div className="photo-placeholder"><GraduationCap size={34}/><span>MEMORY {String(i + 1).padStart(2, '0')}</span></div></div>)}</div></section>
      </main>
      <footer className="footer"><div className="container footer-inner"><div className="footer-brand"><GraduationCap size={25}/><strong>THE GRADUATION</strong><span>CELEBRATION</span></div><p>Celebrating milestones. Creating memories.</p><a href="#home">Back to top ↑</a></div><div className="container footer-bottom"><span>© 2026 Graduation Celebration. All rights reserved.</span><span>Made for a moment worth remembering.</span></div></footer>
    </div>
  )
}
export default App
