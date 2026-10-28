import { useEffect, useState, type FormEvent, type DragEvent } from 'react'
import { ArrowLeft, ImagePlus, UploadCloud, X, Pencil, Check, Trash2 } from 'lucide-react'
import './Admin.css'

type PendingPhoto = {file:File;preview:string;caption:string;key:string}
type Photo = { id?: string; src: string; alt: string }
type Site = { id: string; slug: string; graduateName: string; status: string; paymentStatus: string; priceTzs: number; rsvpCount?: number; photoCount?: number }

export default function Admin() {
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [selectedSite,setSelectedSite]=useState<string | null>(null)
  const [showCreate,setShowCreate]=useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [queue,setQueue]=useState<PendingPhoto[]>([])
  const [dragging,setDragging]=useState(false)
  const [progress,setProgress]=useState('')
  const [editingCaption,setEditingCaption]=useState<string|null>(null)
  const [captionValue,setCaptionValue]=useState('')
  const [captionBusy,setCaptionBusy]=useState(false)
  const [deletingPhoto,setDeletingPhoto]=useState<string|null>(null)
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
  const [rsvps,setRsvps] = useState<Record<string, {guestName:string; attending:boolean|null; message:string;id:string;wishApproved:boolean}[]>>({})
  const [editingWish,setEditingWish]=useState<string|null>(null)
  const [wishDraft,setWishDraft]=useState('')
  const [wishSaving,setWishSaving]=useState(false)
  const [heroFiles, setHeroFiles] = useState<Record<string, File | null>>({})
  const [heroBusy, setHeroBusy] = useState<string | null>(null)
  const [heroNotice, setHeroNotice] = useState('')

  async function refreshGallery() {
    try {
      const res = await fetch(`/api/admin/gallery${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ''}`, { cache: 'no-store' })
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
      setAuthenticated(true)
    }).catch(() => window.location.replace('/admin/login')).finally(() => setChecking(false))
  }, [])
  useEffect(() => { if (authenticated) void refreshSites() }, [authenticated])
  useEffect(() => { if (authenticated) void refreshGallery() }, [authenticated,siteId])

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

  async function saveWish(siteId:string,wishId:string){
    const message=wishDraft.trim()
    if(!message||message.length>1200){setSiteError('Wish must contain 1 to 1200 characters.');return}
    setWishSaving(true);setSiteError('')
    try{
      const res=await fetch(`/api/admin/sites/${siteId}/rsvps/${wishId}/message`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})})
      const body=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(body.message||'Could not save wish')
      setRsvps(prev=>({...prev,[siteId]:(prev[siteId]||[]).map(w=>w.id===wishId?{...w,message}:w)}))
      setEditingWish(null);setSiteNotice('Wish updated. The public website will show the new text when refreshed.')
    }catch(err){setSiteError(err instanceof Error?err.message:'Could not save wish')}finally{setWishSaving(false)}
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

  function addPhotos(files:FileList|File[]){
    const incoming=Array.from(files)
    const valid=incoming.filter(file=>file.size<=8*1024*1024&&file.size>0&&(file.type.startsWith('image/')||/\\.(jpg|jpeg|png|webp|avif|heic|heif)$/i.test(file.name)))
    if(valid.length!==incoming.length)setError('Some files were skipped: choose supported images under 8 MB each.')
    setQueue(prev=>[...prev,...valid.slice(0,Math.max(0,30-prev.length)).map(file=>({file,preview:URL.createObjectURL(file),caption:'',key:crypto.randomUUID()}))])
    if(incoming.length>30-queue.length)setError('You can queue a maximum of 30 photos per batch.')
  }
  function onDrop(event:DragEvent<HTMLDivElement>){event.preventDefault();setDragging(false);if(!busy)addPhotos(event.dataTransfer.files)}
  function removeQueued(key:string){setQueue(prev=>{const item=prev.find(x=>x.key===key);if(item)URL.revokeObjectURL(item.preview);return prev.filter(x=>x.key!==key)})}
  async function saveCaption(photo:Photo){
    if(!photo.id)return
    setCaptionBusy(true);setError('')
    try{
      const res=await fetch(`/api/admin/gallery/${photo.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({alt:captionValue})})
      const body=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(body.message||'Unable to save caption')
      setPhotos(prev=>prev.map(p=>p.id===photo.id?{...p,alt:captionValue.trim()}:p))
      setEditingCaption(null);setNotice('Caption updated successfully.')
    }catch(err){setError(err instanceof Error?err.message:'Unable to save caption')}finally{setCaptionBusy(false)}
  }
  async function deletePhoto(photo:Photo){
    if(!photo.id||deletingPhoto)return
    if(!window.confirm(`Permanently delete this photo${photo.alt ? ` (${photo.alt})` : ''}? This cannot be undone.`))return
    setDeletingPhoto(photo.id);setError('');setNotice('')
    try{
      const res=await fetch(`/api/admin/gallery/${photo.id}`,{method:'DELETE'})
      const body=await res.json().catch(()=>({}))
      if(!res.ok)throw new Error(body.message||'Unable to delete photo')
      setPhotos(prev=>prev.filter(item=>item.id!==photo.id))
      setNotice('Photo deleted successfully.')
      await refreshSites()
    }catch(err){setError(err instanceof Error?err.message:'Unable to delete photo')}
    finally{setDeletingPhoto(null)}
  }
  async function handleUpload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!queue.length)return
    setBusy(true);setError('');setNotice('')
    const pending=[...queue];let success=0;let failed=0
    for(const [index,item] of pending.entries()){
      setProgress(`Uploading ${index+1} of ${pending.length}: ${item.file.name}`)
      try{
        const data=new FormData();data.append('image',item.file);data.append('alt',item.caption.trim()||'Graduation memory')
        if(siteId)data.append('siteId',siteId)
        const res=await fetch('/api/admin/gallery',{method:'POST',body:data})
        const body=await res.json().catch(()=>({}))
        if(!res.ok)throw new Error(body.message||'Upload failed')
        success++;removeQueued(item.key)
      }catch{failed++}
    }
    setProgress('');setBusy(false)
    setNotice(`${success} photo(s) uploaded successfully.`)
    if(failed)setError(`${failed} photo(s) failed. They remain in the queue for retry.`)
    await refreshGallery()
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
              <div className={dragging?'admin-dropzone dragging':'admin-dropzone'} onDragOver={e=>{e.preventDefault();if(!busy)setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={onDrop}>
                <UploadCloud size={31}/><strong>Drag and drop your photos here</strong><span>or select multiple photos from your device</span>
                <label className="admin-file-picker" htmlFor="admin-photo">Browse photos</label>
                <input id="admin-photo" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif,image/heif,image/heic" disabled={busy} onChange={e=>{if(e.target.files)addPhotos(e.target.files);e.target.value=''}}/>
                <small>Up to 30 photos per batch, 8 MB per image</small>
              </div>
              {queue.length>0&&<div className="admin-upload-queue"><h3>Preview photos ({queue.length})</h3><div className="admin-upload-previews">{queue.map(item=><div className="admin-upload-preview" key={item.key}><img src={item.preview} alt={item.file.name}/><div><strong>{item.file.name}</strong><label htmlFor={`caption-${item.key}`}>Caption</label><input id={`caption-${item.key}`} maxLength={200} value={item.caption} onChange={e=>setQueue(prev=>prev.map(p=>p.key===item.key?{...p,caption:e.target.value}:p))} placeholder="Describe this moment"/><button type="button" disabled={busy} onClick={()=>removeQueued(item.key)}><X size={14}/> Remove</button></div></div>)}</div></div>}
              {progress&&<p role="status" className="admin-hint">{progress}</p>}
              {error && <p className="admin-error" role="alert">{error}</p>}
              {notice && <p className="admin-success" role="status">{notice}</p>}
              <button className="admin-submit" type="submit" disabled={busy||queue.length===0}><UploadCloud size={19}/>{busy ? 'Uploading…' : `Upload ${queue.length} photo${queue.length===1?'':'s'}`}</button>
            </form>
          </section>
          <section className="admin-panel" aria-labelledby="gallery-title">
            <div className="admin-gallery-heading"><h2 id="gallery-title">Gallery photos</h2><span>{photos.length} shown</span></div>
            {galleryError ? <p className="admin-hint">Unable to load the gallery. Refresh the page to try again.</p> : photos.length === 0 ? <div className="admin-empty"><ImagePlus size={30}/><p>No photos uploaded yet.</p></div> : <div className="admin-photo-grid">{photos.map(photo => <div key={photo.id || photo.src} className="admin-thumb"><img src={photo.src} alt={photo.alt || 'Graduation photograph'} loading="lazy" />{editingCaption===photo.id?<div className="admin-caption-editor"><input maxLength={200} aria-label="Edit photo caption" value={captionValue} onChange={e=>setCaptionValue(e.target.value)}/><button type="button" disabled={captionBusy} onClick={()=>void saveCaption(photo)}><Check size={15}/> Save</button><button type="button" onClick={()=>setEditingCaption(null)}>Cancel</button></div>:<div className="admin-caption-row"><span>{photo.alt||'Graduation photograph'}</span><button type="button" onClick={()=>{setEditingCaption(photo.id||null);setCaptionValue(photo.alt||'')}} disabled={!photo.id}><Pencil size={14}/> Edit</button><button type="button" className="admin-delete-photo" disabled={!photo.id||deletingPhoto===photo.id} onClick={()=>void deletePhoto(photo)}><Trash2 size={14}/> {deletingPhoto===photo.id?"Deleting…":"Delete"}</button></div>}</div>)}</div>}
            <p className="admin-hint">Edit captions or permanently delete unwanted photos. Deletion requires confirmation.</p>
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
          {selectedSite && <button type="button" className="admin-small-btn" onClick={()=>setSelectedSite(null)}>Show all graduate controls</button>}<div className="admin-site-list">{sites.filter(site=>!selectedSite||site.id===selectedSite).map(site => <div className="admin-site-row" key={site.id}><div><strong>{site.graduateName}</strong><small>{site.slug} · {site.priceTzs.toLocaleString()} TZS</small><small>{site.paymentStatus} / {site.status}</small><a className="admin-site-link" href={`/s/${site.slug}`} target="_blank" rel="noopener noreferrer">Open website</a></div><div className="site-rsvp-panel"><button type="button" className="admin-small-btn" onClick={()=>void loadRsvps(site.id)}>View guest responses</button>{rsvps[site.id] && <div className="rsvp-admin-list"><p><strong>{rsvps[site.id].length} responses · {rsvps[site.id].filter(guest=>guest.attending).length} attending · {rsvps[site.id].filter(guest=>guest.attending===false).length} declined</strong></p>{rsvps[site.id].length===0?<p>No responses yet</p>:rsvps[site.id].map((guest,i)=><p key={i}><strong>{guest.guestName}</strong> · {guest.attending===null?'Wishes only':guest.attending?'Attending':'Not attending'}{guest.message&&<div className="admin-wish-entry">{editingWish===guest.id?<div className="admin-wish-editor"><textarea aria-label="Edit guest wish" maxLength={1200} rows={4} value={wishDraft} onChange={e=>setWishDraft(e.target.value)}/><div><button type="button" disabled={wishSaving||!wishDraft.trim()} onClick={()=>void saveWish(site.id,guest.id)}>Save wish</button><button type="button" disabled={wishSaving} onClick={()=>setEditingWish(null)}>Cancel</button></div></div>:<><span>{guest.message}</span><div className="admin-wish-actions"><button type="button" className="admin-small-btn" onClick={()=>{setEditingWish(guest.id);setWishDraft(guest.message)}}>Edit wish</button>{guest.wishApproved&&<button type="button" className="admin-small-btn" onClick={()=>void moderateWish(site.id,guest.id,false)}>Hide wish</button>}</div></>}</div>}</p>)}</div>}</div><div className="admin-hero-upload"><label>Hero portrait<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heif" onChange={e=>setHeroFiles(prev=>({...prev,[site.id]:e.target.files?.[0] || null}))}/></label><button type="button" disabled={heroBusy===site.id} onClick={()=>void uploadHero(site.id)}>{heroBusy===site.id ? "Uploading…" : "Upload hero photo"}</button></div><div className="admin-site-actions"><button type="button" onClick={() => void updateSite(site.id, { paymentStatus: site.paymentStatus === 'paid' ? 'pending' : 'paid' })}>{site.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}</button><button type="button" onClick={() => void updateSite(site.id, { status: site.status === 'active' ? 'suspended' : 'active' })}>{site.status === 'active' ? 'Suspend' : 'Activate'}</button></div></div>)}</div>
        </section>
        </div>
      </div>
    </main>
  )
}
