import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ImagePlus, UploadCloud } from 'lucide-react'
import './Admin.css'

type Photo = { id?: string; src: string; alt: string }
type Site = { id: string; slug: string; graduateName: string; status: string; paymentStatus: string; priceTzs: number; rsvpCount?: number; photoCount?: number }

export default function Admin() {
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [selectedSite,setSelectedSite]=useState<string | null>(null)
  const [showCreate,setShowCreate]=useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [galleryError, setGalleryError] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [siteId, setSiteId] = useState('')
  const [graduateName, setGraduateName] = useState('')
  const [slug, setSlug] = useState('')
  const [priceTzs, setPriceTzs] = useState('30000')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [venue, setVenue] = useState('')
  const [siteMessage, setSiteMessage] = useState('')
  const [siteNotice, setSiteNotice] = useState('')
  const [siteError, setSiteError] = useState('')
  const [siteBusy, setSiteBusy] = useState(false)
  const [rsvps,setRsvps] = useState<Record<string, {guestName:string; attending:boolean; message:string;id:string;wishApproved:boolean}[]>>({})
  const [heroFiles, setHeroFiles] = useState<Record<string, File | null>>({})
  const [heroBusy, setHeroBusy] = useState<string | null>(null)
  const [heroNotice, setHeroNotice] = useState('')

  async function refreshGallery() {
    try {
      const res = await fetch('/api/gallery', { cache: 'no-store' })
      if (!res.ok) throw new Error('Gallery could not be loaded.')
      const items: Photo[] = await res.json()
      if (!Array.isArray(items)) throw new Error('Unexpected gallery response.')
      setPhotos(items)
      setGalleryError(false)
    } catch {
      setGalleryError(true)
    }
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(v => {
      if (!v.authenticated) { window.location.replace('/admin/login'); return }
      setAuthenticated(true); void refreshGallery()
    }).catch(() => window.location.replace('/admin/login')).finally(() => setChecking(false))
  }, [])
  useEffect(() => { if (authenticated) void refreshSites() }, [authenticated])

  async function refreshSites() {
    if (!authenticated) return
    try {
      const res = await fetch('/api/admin/sites', { headers: {}, cache: 'no-store' })
      if (!res.ok) throw new Error('Unable to load sites. Please sign in again.')
      setSites(await res.json())
      setSiteError('')
    } catch (error) { setSiteError(error instanceof Error ? error.message : 'Unable to load sites') }
  }

  async function createSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSiteBusy(true); setSiteError(''); setSiteNotice('')
    try {
      const response = await fetch('/api/admin/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graduateName, slug, priceTzs: Number(priceTzs), eventDate: eventDate || null, eventTime, venue, message: siteMessage })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not create website')
      setSiteNotice('Graduation website created as a draft. Mark payment paid and activate it when ready.')
      setGraduateName(''); setSlug(''); setEventDate(''); setEventTime(''); setVenue(''); setSiteMessage('')
      await refreshSites()
    } catch (error) { setSiteError(error instanceof Error ? error.message : 'Could not create website') }
    finally { setSiteBusy(false) }
  }

  async function updateSite(id: string, changes: Record<string, string>) {
    setSiteError(''); setSiteNotice('')
    try {
      const response = await fetch(`/api/admin/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not update site')
      setSiteNotice('Website updated successfully.')
      await refreshSites()
    } catch (error) { setSiteError(error instanceof Error ? error.message : 'Could not update site') }
  }

  async function loadRsvps(id: string) {
    try {
      const response=await fetch(`/api/admin/sites/${id}/rsvps`)
      if(!response.ok)throw new Error('Could not load guest responses')
      const records=await response.json()
      setRsvps(prev=>({...prev,[id]:records}))
    } catch(e){setSiteError(e instanceof Error?e.message:'Could not load responses')}
  }

  async function moderateWish(siteId:string,id:string,approved:boolean){
    try{
      const response=await fetch(`/api/admin/sites/${siteId}/rsvps/${id}/wish`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({approved})})
      if(!response.ok)throw new Error('Could not update wish')
      await loadRsvps(siteId)
    }catch{setSiteError('Could not update wish')}
  }

  async function uploadHero(id: string) {
    const file = heroFiles[id]
    if (!file) {setSiteError('Choose a hero portrait first.');return}
    if (file.size > 8 * 1024 * 1024) {setSiteError('Hero photo must be under 8 MB.');return}
    setSiteError('');setHeroNotice('');setHeroBusy(id)
    try {
      const form = new FormData()
      form.append('image',file)
      const res = await fetch(`/api/admin/sites/${id}/hero`,{method:'POST',body:form})
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Could not upload portrait')
      setHeroNotice('Hero portrait updated. Refresh the graduate website to view it.')
      setHeroFiles(previous=>({...previous,[id]:null}))
    } catch(e) {setSiteError(e instanceof Error ? e.message : 'Upload failed')}
    finally {setHeroBusy(null)}
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!file) { setError('Select a photo first.'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Select an image smaller than 8 MB.'); return }
    setBusy(true)
    try {
      const payload = new FormData()
      payload.append('image', file)
      payload.append('alt', alt.trim() || 'Graduation memory')
      if (siteId) payload.append('siteId', siteId)
      const response = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: {},
        body: payload,
      })
      const result: { message?: string } = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(response.status === 401
        ? 'Your session has expired. Please sign in again.'
        : result.message || 'Upload failed. Please try again.')
      setNotice('Photo uploaded successfully. It is now available in the public gallery.')
      setFile(null)
      setAlt('')
      const input = document.getElementById('admin-photo') as HTMLInputElement | null
      if (input) input.value = ''
      await refreshGallery()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const filteredSites=sites.filter(site => (filter==='all'||(filter==='unpaid'?site.paymentStatus==='pending':site.status===filter)) && (site.graduateName+' '+site.slug).toLowerCase().includes(search.toLowerCase()))
  const activeSite=sites.find(site=>site.id===selectedSite)
  const money=sites.filter(s=>s.paymentStatus==='paid').reduce((n,s)=>n+s.priceTzs,0)
  if (checking || !authenticated) return <main className="admin-shell"><p style={{padding:40}}>Checking administrator session…</p></main>
  async function logout() {
    await fetch('/api/auth/logout',{method:'POST'})
    window.location.assign('/admin/login')
  }
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a href="/" className="admin-back"><ArrowLeft size={18} /> Back to website</a>
        <button type="button" className="admin-small-btn" onClick={() => void logout()}>Log out</button>
      </header>
      <div className="admin-wrap">
        <div className="admin-heading">
          <span className="admin-eyebrow">GRADUATION WEBSITE · ADMIN</span>
          <h1>Graduation <em>Dashboard.</em></h1>
          <p>Monitor graduates, websites, guest responses and payments from one workspace.</p>
        </div>
        <div className="admin-metrics"><div><span>Websites</span><strong>{sites.length}</strong></div><div><span>Active</span><strong>{sites.filter(s=>s.status==='active').length}</strong></div><div><span>Payments pending</span><strong>{sites.filter(s=>s.paymentStatus==='pending').length}</strong></div><div><span>Recorded paid value</span><strong>{money.toLocaleString()} <small>TZS</small></strong></div></div>
<div className="admin-toolbar"><input aria-label="Search graduates" placeholder="Search graduate or URL…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter websites" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All websites</option><option value="active">Active</option><option value="draft">Draft</option><option value="suspended">Suspended</option><option value="unpaid">Payment pending</option></select><button type="button" onClick={()=>setShowCreate(v=>!v)}>{showCreate?'Close form':'+ New graduate'}</button></div>
<section className="admin-panel admin-directory"><h2>All graduation websites <small>({filteredSites.length})</small></h2><div className="admin-directory-list">{filteredSites.map(site=><div className="admin-directory-item" key={site.id}><div><strong>{site.graduateName}</strong><small>/s/{site.slug}</small></div><div className="admin-directory-meta"><span>{site.status}</span><span>{site.paymentStatus}</span><small>{site.rsvpCount ?? 0} guests · {site.photoCount ?? 0} photos</small></div><button type="button" onClick={()=>{setSelectedSite(site.id);setSiteId(site.id)}}>Manage</button></div>)}{filteredSites.length===0&&<p>No matching graduates found.</p>}</div></section>
<div className="admin-columns">
          {activeSite && <div className="admin-context"><h2>Managing {activeSite.graduateName}</h2><p>Upload gallery photos below, or use their management card for hero image, attendance and payment controls.</p><a href={`/s/${activeSite.slug}`} target="_blank" rel="noopener noreferrer">Open public website</a></div>}
          <section className="admin-panel" aria-labelledby="upload-title">
            <h2 id="upload-title"><ImagePlus size={22} /> Upload a photo</h2>
            <form onSubmit={handleUpload} className="admin-form">
              <label htmlFor="admin-site-upload">Upload to website</label>
              <select id="admin-site-upload" value={siteId} onChange={e => setSiteId(e.target.value)}><option value="">Main website</option>{sites.map(site => <option key={site.id} value={site.id}>{site.graduateName} ({site.slug})</option>)}</select>
              <label htmlFor="admin-photo">Graduation photo</label>
              <input id="admin-photo" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heif" onChange={e => setFile(e.target.files?.[0] || null)} required />
              <p className="admin-hint">JPG, PNG, WebP, AVIF or HEIF · Maximum 8 MB · Automatically optimized.</p>
              <label htmlFor="admin-alt">Photo description</label>
              <input id="admin-alt" type="text" maxLength={200} value={alt} onChange={e => setAlt(e.target.value)} placeholder="e.g. Graduation ceremony group photograph" />
              {error && <p className="admin-error" role="alert">{error}</p>}
              {notice && <p className="admin-success" role="status">{notice}</p>}
              <button className="admin-submit" type="submit" disabled={busy}><UploadCloud size={19}/>{busy ? 'Uploading…' : 'Upload photo'}</button>
            </form>
          </section>
          <section className="admin-panel" aria-labelledby="gallery-title">
            <div className="admin-gallery-heading"><h2 id="gallery-title">Gallery photos</h2><span>{photos.length} shown</span></div>
            {galleryError ? <p className="admin-hint">Unable to load the gallery. Refresh the page to try again.</p> : photos.length === 0 ? <div className="admin-empty"><ImagePlus size={30}/><p>No photos uploaded yet.</p></div> : <div className="admin-photo-grid">{photos.map(photo => <div key={photo.id || photo.src} className="admin-thumb"><img src={photo.src} alt={photo.alt || 'Graduation photograph'} loading="lazy" /><span>{photo.alt || 'Graduation photograph'}</span></div>)}</div>}
            <p className="admin-hint">Your site currently supports adding and viewing photos. Editing and deleting will be available in a future update.</p>
          </section>
        <section className="admin-panel admin-sites-panel" aria-labelledby="sites-title">
          <div className="admin-gallery-heading"><h2 id="sites-title">Graduation websites</h2><button type="button" className="admin-small-btn" onClick={() => void refreshSites()}>Load sites</button></div>
          <p className="admin-hint">You are signed in as an administrator. Load sites to manage customer websites. Each graduate gets a separate link on this temporary domain and their own photo gallery.</p>
          {showCreate && <form className="admin-form" onSubmit={createSite}>
            <label htmlFor="graduate-name">Graduate's full name</label><input id="graduate-name" value={graduateName} onChange={e=>setGraduateName(e.target.value)} maxLength={160} required placeholder="e.g. Veronica Daud"/>
            <label htmlFor="graduate-slug">Website URL name</label><input id="graduate-slug" value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} maxLength={63} required placeholder="e.g. veronica"/>
            <label htmlFor="graduate-price">Price (TZS)</label><input id="graduate-price" type="number" min="0" step="1" value={priceTzs} onChange={e=>setPriceTzs(e.target.value)} required/>
            <label htmlFor="graduate-date">Ceremony date (optional)</label><input id="graduate-date" type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)}/>
            <label htmlFor="graduate-time">Time (optional)</label><input id="graduate-time" value={eventTime} onChange={e=>setEventTime(e.target.value)} maxLength={100}/>
            <label htmlFor="graduate-venue">Venue (optional)</label><input id="graduate-venue" value={venue} onChange={e=>setVenue(e.target.value)} maxLength={240}/>
            <label htmlFor="graduate-message">Personal message (optional)</label><textarea id="graduate-message" value={siteMessage} onChange={e=>setSiteMessage(e.target.value)} maxLength={3000} rows={3}/>
            <button className="admin-submit" type="submit" disabled={siteBusy}>{siteBusy ? 'Creating…' : 'Create graduation website'}</button>
          </form>}
          {siteError && <p className="admin-error" role="alert">{siteError}</p>}
          {siteNotice && <p className="admin-success" role="status">{siteNotice}</p>}{heroNotice && <p className="admin-success" role="status">{heroNotice}</p>}
          {selectedSite && <button type="button" className="admin-small-btn" onClick={()=>setSelectedSite(null)}>Show all graduate controls</button>}<div className="admin-site-list">{sites.filter(site=>!selectedSite||site.id===selectedSite).map(site => <div className="admin-site-row" key={site.id}><div><strong>{site.graduateName}</strong><small>{site.slug} · {site.priceTzs.toLocaleString()} TZS</small><small>{site.paymentStatus} / {site.status}</small><a className="admin-site-link" href={`/s/${site.slug}`} target="_blank" rel="noopener noreferrer">Open website</a></div><div className="site-rsvp-panel"><button type="button" className="admin-small-btn" onClick={()=>void loadRsvps(site.id)}>View guest responses</button>{rsvps[site.id] && <div className="rsvp-admin-list"><p><strong>{rsvps[site.id].length} responses · {rsvps[site.id].filter(guest=>guest.attending).length} attending · {rsvps[site.id].filter(guest=>!guest.attending).length} declined</strong></p>{rsvps[site.id].length===0?<p>No responses yet</p>:rsvps[site.id].map((guest,i)=><p key={i}><strong>{guest.guestName}</strong> · {guest.attending?'Attending':'Not attending'}{guest.message&&<span> — {guest.message} {guest.wishApproved && <button type="button" className="admin-small-btn" onClick={()=>void moderateWish(site.id,guest.id,false)}>Hide wish</button>}</span>}</p>)}</div>}</div><div className="admin-hero-upload"><label>Hero portrait<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heif" onChange={e=>setHeroFiles(prev=>({...prev,[site.id]:e.target.files?.[0] || null}))}/></label><button type="button" disabled={heroBusy===site.id} onClick={()=>void uploadHero(site.id)}>{heroBusy===site.id ? "Uploading…" : "Upload hero photo"}</button></div><div className="admin-site-actions"><button type="button" onClick={() => void updateSite(site.id, { paymentStatus: site.paymentStatus === 'paid' ? 'pending' : 'paid' })}>{site.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}</button><button type="button" onClick={() => void updateSite(site.id, { status: site.status === 'active' ? 'suspended' : 'active' })}>{site.status === 'active' ? 'Suspend' : 'Activate'}</button></div></div>)}</div>
        </section>
        </div>
      </div>
    </main>
  )
}
