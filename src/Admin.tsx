import { useEffect, useState, type FormEvent, type DragEvent } from 'react'
import { ArrowLeft, GraduationCap, ImagePlus, UploadCloud, X, Pencil, Check, Trash2 } from 'lucide-react'
import './Admin.css'

type PendingPhoto = {file:File;preview:string;caption:string;key:string}
type GiftMethod = {provider:string;account:string;name:string}
type Photo = { id?: string; src: string; alt: string }
type Site = { id: string; slug: string; graduateName: string; eventDate?:string|null; eventTime?:string|null; venue?:string|null; mapsUrl?:string|null; message?:string|null; status: string; paymentStatus: string; priceTzs: number; rsvpCount?: number; photoCount?: number; giftPhone?:string|null; giftName?:string|null; giftProvider?:string|null;giftMethods?:GiftMethod[]; musicFilename?:string|null; musicSection?:string; theme?:string;showGallery?:boolean;showWishes?:boolean;showGifts?:boolean;showCountdown?:boolean }

export default function Admin() {
  const [adminTab,setAdminTab]=useState<'websites'|'gallery'|'manage'|'guests'>('websites')
  const [detailEdits,setDetailEdits]=useState<Record<string,{graduateName:string;eventDate:string;eventTime:string;venue:string;mapsUrl:string;message:string}>>({})
  const [detailSaving,setDetailSaving]=useState<string|null>(null)
  const [musicUploads,setMusicUploads]=useState<Record<string,File|null>>({})
  const [musicBusy,setMusicBusy]=useState<string|null>(null)
  const [guestLinks,setGuestLinks]=useState<Record<string,string|null>>({})
  const [guestLinkBusy,setGuestLinkBusy]=useState<string|null>(null)
  const [guestLinkNotice,setGuestLinkNotice]=useState('')
  const [search,setSearch]=useState('')
  const [filter,setFilter]=useState('all')
  const [directoryPage,setDirectoryPage]=useState(1)
  const [directorySort,setDirectorySort]=useState('newest')
  const pageSize=12
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
  const [reorderingPhoto,setReorderingPhoto]=useState(false)
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
  const [giftPhone,setGiftPhone]=useState('')
  const [giftName,setGiftName]=useState('')
  const [giftProvider,setGiftProvider]=useState('')
  const [methodEdits,setMethodEdits]=useState<Record<string,GiftMethod[]>>({})
  const [giftEdits,setGiftEdits]=useState<Record<string,{giftPhone:string;giftName:string;giftProvider:string}>>({})
  const [siteMessage, setSiteMessage] = useState('')
  const [siteNotice, setSiteNotice] = useState('')
  const [siteError, setSiteError] = useState('')
  const [siteBusy, setSiteBusy] = useState(false)
  const [rsvps,setRsvps] = useState<Record<string, {guestName:string; attending:boolean|null;attendanceChoice?:'yes'|'maybe'|'no'|null; message:string;id:string;wishApproved:boolean}[]>>({})
  const [attendanceFilters,setAttendanceFilters]=useState<Record<string,string>>({})
  const [guestView,setGuestView]=useState<'attendance'|'wishes'>('attendance')
  const [selectedAttendance,setSelectedAttendance]=useState<Record<string,string[]>>({})
  const [deletingAttendance,setDeletingAttendance]=useState(false)
  const [selectedWishes,setSelectedWishes]=useState<Record<string,string[]>>({})
  const [deletingWishes,setDeletingWishes]=useState(false)
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
        body: JSON.stringify({ graduateName, slug, priceTzs: Number(priceTzs), eventDate: eventDate || null, eventTime, venue, giftPhone,giftName,giftProvider, message: siteMessage })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'Could not create website')
      setSiteNotice('Graduation website created as a draft. Mark payment paid and activate it when ready.')
      setGraduateName(''); setSlug(''); setEventDate(''); setEventTime(''); setVenue(''); setGiftPhone('');setGiftName('');setGiftProvider('');setSiteMessage('')
      await refreshSites()
    } catch (error) { setSiteError(error instanceof Error ? error.message : 'Could not create website') }
    finally { setSiteBusy(false) }
  }

  async function updateSite(id: string, changes: Record<string, string|boolean|GiftMethod[]>) {
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

  function attendanceCategory(guest:{attendanceChoice?:'yes'|'maybe'|'no'|null;attending:boolean|null;message?:string}){
    return guest.attendanceChoice==='maybe'?'maybe':guest.attendanceChoice==='yes'||guest.attending===true?'yes':guest.attendanceChoice==='no'||guest.attending===false?'no':guest.message?.trim()?'wishes':'empty'
  }
  function exportGuestResponses(id:string,graduateName:string){
    const records=rsvps[id]||[]
    const selected=records.filter(guest=>attendanceCategory(guest)!=='empty'&&((attendanceFilters[id]||'all')==='all'||attendanceCategory(guest)===attendanceFilters[id]))
    const cell=(value:string)=>'"'+( /^[=+\-@\t\r]/.test(value)? "'"+value:value).replace(/"/g,'""')+'"'
    const lines=[['Name','Attendance','Message'],...selected.map(guest=>[guest.guestName,attendanceCategory(guest),guest.message])]
    const csv='\uFEFF'+lines.map(row=>row.map(value=>cell(value)).join(',')).join('\r\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const a=document.createElement('a');a.href=url;a.download=(graduateName.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'graduate')+'-guest-list.csv';a.click()
    window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  async function saveGraduateDetails(site:Site){
    const draft=detailEdits[site.id];
    if(!draft)return;
    setDetailSaving(site.id);setSiteError('');setSiteNotice('');
    try{
      const graduateName=draft.graduateName.trim();
      if(!graduateName||graduateName.length>160)throw new Error('Enter a valid graduate name.');
      const changes={graduateName,eventDate:draft.eventDate,eventTime:draft.eventTime.trim(),venue:draft.venue.trim(),mapsUrl:draft.mapsUrl.trim(),message:draft.message.trim()};
      const response=await fetch('/api/admin/sites/'+site.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(changes)});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.message||'Could not save graduate details');
      setDetailEdits(prev=>{const next={...prev};delete next[site.id];return next});
      setSiteNotice('Graduate details saved successfully.');
      await refreshSites();
    }catch(error){setSiteError(error instanceof Error?error.message:'Could not save graduate details')}
    finally{setDetailSaving(null)}
  }
  async function uploadMusic(id:string){
    const file=musicUploads[id];if(!file)return;
    setMusicBusy(id);setSiteError('');
    try{
      const data=new FormData();data.append('audio',file);
      const res=await fetch('/api/admin/sites/'+id+'/music',{method:'POST',body:data});
      const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.message||'Music upload failed');
      setMusicUploads(prev=>({...prev,[id]:null}));setSiteNotice('Music uploaded. Visitors can play it when they choose.');
      await refreshSites();
    }catch(e){setSiteError(e instanceof Error?e.message:'Music upload failed')}finally{setMusicBusy(null)}
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

  async function deleteAttendance(siteId:string,ids:string[]){
    if(!ids.length||!window.confirm('Remove attendance status for '+ids.length+' guest(s)? Their wishes will be kept.'))return;
    setDeletingAttendance(true);setSiteError('');
    try{
      const response=await fetch('/api/admin/sites/'+siteId+'/attendance',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.message||'Unable to remove attendance');
      setSelectedAttendance(prev=>({...prev,[siteId]:[]}));
      await loadRsvps(siteId);await refreshSites();
      setSiteNotice(data.cleared+' attendance statuses cleared. Existing wishes retained.');
    }catch(e){setSiteError(e instanceof Error?e.message:'Unable to remove attendance')}finally{setDeletingAttendance(false)}
  }
  async function deleteWishes(siteId:string,ids:string[]){
    if(!ids.length)return;
    if(!window.confirm('Permanently delete '+ids.length+' wish(es)? Guest attendance records will remain.'))return;
    setDeletingWishes(true);setSiteError('');
    try{
      const r=await fetch('/api/admin/sites/'+siteId+'/wishes',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
      const result=await r.json().catch(()=>({}));if(!r.ok)throw new Error(result.message||'Delete failed');
      setSelectedWishes(prev=>({...prev,[siteId]:[]}));
      await loadRsvps(siteId);setSiteNotice(result.deleted+' wishes deleted. Guest attendance preserved.');
    }catch(e){setSiteError(e instanceof Error?e.message:'Delete failed')}finally{setDeletingWishes(false)}
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
  async function movePhoto(index:number,direction:-1|1|0){
    const next=direction===0?0:index+direction;
    if(reorderingPhoto||next<0||next>=photos.length)return;
    const reordered=[...photos];
    if(direction===0){const [selected]=reordered.splice(index,1);reordered.unshift(selected)}else{[reordered[index],reordered[next]]=[reordered[next],reordered[index]];}
    if(reordered.some(photo=>!photo.id))return;
    setReorderingPhoto(true);setError('');
    try{
      const res=await fetch('/api/admin/gallery/reorder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({siteId:siteId||null,ids:reordered.map(photo=>photo.id)})});
      if(!res.ok){const body=await res.json().catch(()=>({}));throw new Error(body.message||'Could not reorder gallery')}
      setPhotos(reordered);setNotice('Gallery order saved.');
    }catch(err){setError(err instanceof Error?err.message:'Unable to change order')}
    finally{setReorderingPhoto(false)}
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
  const sortedSites=[...filteredSites].sort((a,b)=>directorySort==='name'?a.graduateName.localeCompare(b.graduateName):directorySort==='responses'?(b.rsvpCount||0)-(a.rsvpCount||0):directorySort==='photos'?(b.photoCount||0)-(a.photoCount||0):sites.indexOf(a)-sites.indexOf(b))
  const pageCount=Math.max(1,Math.ceil(sortedSites.length/pageSize))
  const currentDirectoryPage=Math.min(directoryPage,pageCount)
  const visibleSites=sortedSites.slice((currentDirectoryPage-1)*pageSize,currentDirectoryPage*pageSize)
  const activeSite=sites.find(site=>site.id===selectedSite)
  const money=sites.filter(s=>s.paymentStatus==='paid').reduce((n,s)=>n+s.priceTzs,0)
  if (checking || !authenticated) return <main className="admin-shell"><p style={{padding:40}}>Checking administrator session…</p></main>
  async function manageGuestLink(id:string,operation:'load'|'create'|'revoke'){
    setGuestLinkBusy(id);setGuestLinkNotice('')
    try{
      const response=await fetch('/api/admin/sites/'+id+'/guest-link',{method:operation==='create'?'POST':operation==='revoke'?'DELETE':'GET'})
      const data=await response.json();if(!response.ok)throw new Error(data.message||'Unable to manage link')
      setGuestLinks(previous=>({...previous,[id]:operation==='revoke'?null:data.token||null}))
      if(operation==='create')setGuestLinkNotice('Link created. Share it only with the graduate.')
      if(operation==='revoke')setGuestLinkNotice('Link revoked.')
    }catch(error){setGuestLinkNotice(error instanceof Error?error.message:'Unable to manage link')}finally{setGuestLinkBusy(null)}
  }
  async function logout() {
    await fetch('/api/auth/logout',{method:'POST'})
    window.location.assign('/admin/login')
  }
  return (
    <main className="admin-shell">
      <header className="admin-topbar refreshed-admin-topbar"><div className="admin-header-brand"><span className="admin-header-icon"><GraduationCap size={24}/></span><span><strong>Graduation Studio</strong><small>ADMIN WORKSPACE</small></span></div><div className="admin-header-actions"><a href="/" className="admin-back"><ArrowLeft size={16}/> View website</a><span className="admin-header-role">Administrator</span><button type="button" className="admin-small-btn" onClick={() => void logout()}>Log out</button></div></header>
      <div className="admin-wrap">
        <div className="admin-heading">
          <span className="admin-eyebrow">GRADUATION WEBSITE · ADMIN</span>
          <h1>Graduation <em>Dashboard.</em></h1>
          <p>Monitor graduates, websites, guest responses and payments from one workspace.</p>
        </div>
        <div className="admin-metrics"><div><span>Websites</span><strong>{sites.length}</strong></div><div><span>Active</span><strong>{sites.filter(s=>s.status==='active').length}</strong></div><div><span>Payments pending</span><strong>{sites.filter(s=>s.paymentStatus==='pending').length}</strong></div><div><span>Recorded paid value</span><strong>{money.toLocaleString()} <small>TZS</small></strong></div></div>
<div className="admin-toolbar"><input aria-label="Search graduates" placeholder="Search graduate or URL…" value={search} onChange={e=>{setSearch(e.target.value);setDirectoryPage(1)}}/><select aria-label="Filter websites" value={filter} onChange={e=>{setFilter(e.target.value);setDirectoryPage(1)}}><option value="all">All websites</option><option value="active">Active</option><option value="draft">Draft</option><option value="suspended">Suspended</option><option value="unpaid">Payment pending</option></select><button type="button" onClick={()=>{setAdminTab('manage');setSelectedSite(null);setShowCreate(v=>!v)}}>{showCreate?'Close form':'+ New graduate'}</button></div>
<nav className="admin-section-tabs" aria-label="Dashboard sections"><button type="button" className={adminTab==='websites'?'active':''} onClick={()=>setAdminTab('websites')}>Websites</button><button type="button" className={adminTab==='manage'?'active':''} onClick={()=>setAdminTab('manage')}>Graduate settings</button><button type="button" className={adminTab==='gallery'?'active':''} onClick={()=>setAdminTab('gallery')}>Photo gallery</button><button type="button" className={adminTab==='guests'?'active':''} onClick={()=>setAdminTab('guests')}>Guests &amp; Wishes</button></nav>
{adminTab==='websites' && <section className="admin-panel admin-directory"><div className="admin-directory-header"><div><span className="admin-eyebrow">WEBSITE DIRECTORY</span><h2>Graduate websites <small>({filteredSites.length})</small></h2><p className="admin-hint">Find a graduate, review their status and open their dedicated workspace.</p></div><label className="admin-directory-sort">Sort by<select aria-label="Sort graduates" value={directorySort} onChange={e=>{setDirectorySort(e.target.value);setDirectoryPage(1)}}><option value="newest">Newest first</option><option value="name">Graduate name</option><option value="responses">Most responses</option><option value="photos">Most photos</option></select></label></div><div className="admin-directory-list">{visibleSites.map(site=><div className="admin-directory-item" key={site.id}><div><strong>{site.graduateName}</strong><small>/{site.slug}</small></div><div className="admin-directory-meta"><span className={`admin-status-pill admin-status-${site.status}`}>{site.status}</span><span className={`admin-status-pill admin-payment-${site.paymentStatus}`}>{site.paymentStatus}</span><small>{site.rsvpCount ?? 0} guests · {site.photoCount ?? 0} photos</small></div><button type="button" onClick={()=>{setSelectedSite(site.id);setSiteId(site.id);setAdminTab('manage')}}>Manage</button></div>)}{filteredSites.length===0&&<p className="admin-directory-empty">No matching graduates. Try a different search or status filter.</p>}</div>{sortedSites.length>pageSize&&<div className="admin-directory-pagination"><span>Showing {(currentDirectoryPage-1)*pageSize+1}–{Math.min(currentDirectoryPage*pageSize,sortedSites.length)} of {sortedSites.length}</span><div><button type="button" disabled={currentDirectoryPage<=1} onClick={()=>setDirectoryPage(p=>Math.max(1,p-1))}>Previous</button><span>Page {currentDirectoryPage} of {pageCount}</span><button type="button" disabled={currentDirectoryPage>=pageCount} onClick={()=>setDirectoryPage(p=>Math.min(pageCount,p+1))}>Next</button></div></div>}</section>}
{adminTab==='guests' && <section className="admin-panel admin-guests-workspace"><div className="admin-directory-header"><div><span className="admin-eyebrow">GUEST MANAGEMENT</span><h2>Guests &amp; Wishes</h2><p className="admin-hint">Review attendance, export guest responses and moderate messages for each graduate.</p></div></div><div className="admin-graduate-selector"><label htmlFor="guest-graduate">Graduate</label><select id="guest-graduate" value={selectedSite||sites[0]?.id||''} onChange={e=>{setSelectedSite(e.target.value);setSiteId(e.target.value)}}><option value="" disabled>Select graduate</option>{sites.map(item=><option key={item.id} value={item.id}>{item.graduateName} · {item.slug}</option>)}</select></div>{sites.filter(site=>site.id===(selectedSite||sites[0]?.id)).map(site=><div key={site.id} className="admin-guests-content"><div className="admin-guest-link-panel"><strong>Graduate viewing link</strong><p className="admin-hint">Share this private link with the graduate to view guest names and approved wishes. Anyone with the link can view the details.</p>{guestLinkNotice&&<p role="status">{guestLinkNotice}</p>}{guestLinks[site.id]&&<input aria-label="Graduate guest link" readOnly value={window.location.origin+'/g/'+site.slug+'-'+guestLinks[site.id]}/>}<div className="admin-guest-link-actions"><button type="button" disabled={guestLinkBusy===site.id} onClick={()=>void manageGuestLink(site.id,'load')}>Check link</button><button type="button" disabled={guestLinkBusy===site.id} onClick={()=>void manageGuestLink(site.id,'create')}>{guestLinks[site.id]?'Regenerate link':'Create link'}</button>{guestLinks[site.id]&&<><button type="button" onClick={()=>void navigator.clipboard.writeText(window.location.origin+'/g/'+site.slug+'-'+guestLinks[site.id]!).then(()=>setGuestLinkNotice('Link copied.'))}>Copy link</button><button type="button" disabled={guestLinkBusy===site.id} onClick={()=>void manageGuestLink(site.id,'revoke')}>Revoke</button></>}</div></div><div className="admin-guests-summary">{([['Attending','yes'],['Maybe','maybe'],['Not attending','no'],['Wishes only','wishes']] as const).map(([label,category])=><div className="admin-guests-metric" key={category}><span>{label}</span><strong>{rsvps[site.id]?rsvps[site.id].filter(g=>attendanceCategory(g)===category).length:'—'}</strong></div>)}</div><div className="site-rsvp-panel"><button type="button" className="admin-small-btn" onClick={()=>void loadRsvps(site.id)}>View guest responses</button>{rsvps[site.id] && <div className="rsvp-admin-list"><p><strong>{rsvps[site.id].filter(g=>attendanceCategory(g)!=='empty').length} responses · {rsvps[site.id].filter(g=>attendanceCategory(g)==='yes').length} attending · {rsvps[site.id].filter(g=>attendanceCategory(g)==='maybe').length} maybe · {rsvps[site.id].filter(g=>attendanceCategory(g)==='no').length} not attending · {rsvps[site.id].filter(g=>attendanceCategory(g)==='wishes').length} wishes only</strong></p><div className="admin-guest-view-tabs" role="tablist" aria-label="Manage guest responses"><button type="button" role="tab" aria-selected={guestView==='attendance'} className={guestView==='attendance'?'active':''} onClick={()=>setGuestView('attendance')}>Attendance ({rsvps[site.id].filter(g=>['yes','maybe','no'].includes(attendanceCategory(g))).length})</button><button type="button" role="tab" aria-selected={guestView==='wishes'} className={guestView==='wishes'?'active':''} onClick={()=>setGuestView('wishes')}>Wishes ({rsvps[site.id].filter(g=>g.message.trim()).length})</button></div><div className="admin-rsvp-tools">{guestView==='attendance'&&<div className="admin-attendance-bulk"><label><input type="checkbox" checked={rsvps[site.id].filter(g=>['yes','maybe','no'].includes(attendanceCategory(g))).length>0&&rsvps[site.id].filter(g=>attendanceCategory(g)!=='wishes').every(g=>(selectedAttendance[site.id]||[]).includes(g.id))} onChange={e=>setSelectedAttendance(prev=>({...prev,[site.id]:e.target.checked?rsvps[site.id].filter(g=>attendanceCategory(g)!=='wishes').map(g=>g.id):[]}))}/> Select attendance</label><button type="button" disabled={deletingAttendance||!(selectedAttendance[site.id]||[]).length} onClick={()=>void deleteAttendance(site.id,selectedAttendance[site.id]||[])}>Remove selected ({(selectedAttendance[site.id]||[]).length})</button></div>}{guestView==='wishes'&&<div className="admin-wish-bulk"><label><input type="checkbox" checked={rsvps[site.id].filter(g=>g.message.trim()).length>0&&rsvps[site.id].filter(g=>g.message.trim()).every(g=>(selectedWishes[site.id]||[]).includes(g.id))} onChange={e=>setSelectedWishes(prev=>({...prev,[site.id]:e.target.checked?rsvps[site.id].filter(g=>g.message.trim()).map(g=>g.id):[]}))}/> Select all wishes</label><button type="button" disabled={deletingWishes||!(selectedWishes[site.id]||[]).length} onClick={()=>void deleteWishes(site.id,selectedWishes[site.id]||[])}>Delete selected ({(selectedWishes[site.id]||[]).length})</button></div>}{guestView==='attendance'&&<label>Filter responses <select value={attendanceFilters[site.id]||'all'} onChange={e=>setAttendanceFilters(prev=>({...prev,[site.id]:e.target.value}))}><option value="all">All responses</option><option value="yes">Attending</option><option value="maybe">Maybe</option><option value="no">Not attending</option></select></label>}<button type="button" className="admin-small-btn" onClick={()=>exportGuestResponses(site.id,site.graduateName)}>Export CSV</button></div>{(guestView==='wishes'?rsvps[site.id].filter(g=>g.message.trim()).length===0:rsvps[site.id].filter(g=>attendanceCategory(g)!=='wishes').length===0)?<p>{guestView==='wishes'?'No wishes available.':'No attendance responses available.'}</p>:rsvps[site.id].filter(guest=>guestView==='wishes'?Boolean(guest.message.trim()):['yes','maybe','no'].includes(attendanceCategory(guest))&&((attendanceFilters[site.id]||'all')==='all'||attendanceCategory(guest)===attendanceFilters[site.id])).map((guest,i)=><p key={guest.id||i}><span className="admin-attendance-row">{guestView==='attendance'&&attendanceCategory(guest)!=='wishes'&&<input type="checkbox" aria-label={`Select attendance for ${guest.guestName}`} checked={(selectedAttendance[site.id]||[]).includes(guest.id)} onChange={e=>setSelectedAttendance(prev=>({...prev,[site.id]:e.target.checked?[...(prev[site.id]||[]),guest.id]:(prev[site.id]||[]).filter(id=>id!==guest.id)}))}/>}<strong>{guest.guestName}</strong> · {guest.attendanceChoice==='maybe'?'Maybe':guest.attending===null?'Wishes only':guest.attending?'Attending':'Not attending'}{guestView==='attendance'&&attendanceCategory(guest)!=='wishes'&&<button type="button" className="admin-remove-attendance" disabled={deletingAttendance} onClick={()=>void deleteAttendance(site.id,[guest.id])}>Remove attendance</button>}</span>{guestView==='wishes'&&guest.message&&<div className="admin-wish-entry"><label className="admin-wish-select"><input type="checkbox" aria-label={`Select wish by ${guest.guestName}`} checked={(selectedWishes[site.id]||[]).includes(guest.id)} onChange={e=>setSelectedWishes(prev=>({...prev,[site.id]:e.target.checked?[...(prev[site.id]||[]),guest.id]:(prev[site.id]||[]).filter(id=>id!==guest.id)}))}/> Select wish</label>{editingWish===guest.id?<div className="admin-wish-editor"><textarea aria-label="Edit guest wish" maxLength={1200} rows={4} value={wishDraft} onChange={e=>setWishDraft(e.target.value)}/><div><button type="button" disabled={wishSaving||!wishDraft.trim()} onClick={()=>void saveWish(site.id,guest.id)}>Save wish</button><button type="button" disabled={wishSaving} onClick={()=>setEditingWish(null)}>Cancel</button></div></div>:<><span>{guest.message}</span><div className="admin-wish-actions"><button type="button" className="admin-small-btn" onClick={()=>{setEditingWish(guest.id);setWishDraft(guest.message)}}>Edit wish</button><button type="button" className="admin-small-btn" disabled={deletingWishes} onClick={()=>void deleteWishes(site.id,[guest.id])}>Delete wish</button>{guest.wishApproved&&<button type="button" className="admin-small-btn" onClick={()=>void moderateWish(site.id,guest.id,false)}>Hide wish</button>}</div></>}</div>}</p>)}</div>}</div></div>)}</section>}
{adminTab==='gallery' && <div className="admin-columns">
          {activeSite && <div className="admin-context"><h2>Managing {activeSite.graduateName}</h2><p>Upload gallery photos below, or use their management card for hero image, attendance and payment controls.</p><a href={`/${activeSite.slug}`} target="_blank" rel="noopener noreferrer">Open public website</a></div>}
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
            {galleryError ? <p className="admin-hint">Unable to load the gallery. Refresh the page to try again.</p> : photos.length === 0 ? <div className="admin-empty"><ImagePlus size={30}/><p>No photos uploaded yet.</p></div> : <div className="admin-photo-grid">{photos.map(photo => <div key={photo.id || photo.src} className="admin-thumb"><div className="admin-photo-order"><button type="button" disabled={reorderingPhoto||photos.indexOf(photo)===0} onClick={()=>void movePhoto(photos.indexOf(photo),-1)} aria-label="Move photo earlier">←</button><span>{photos.indexOf(photo)===0?'Featured · 1':photos.indexOf(photo)+1}</span><button type="button" disabled={reorderingPhoto||photos.indexOf(photo)===photos.length-1} onClick={()=>void movePhoto(photos.indexOf(photo),1)} aria-label="Move photo later">→</button>{photos.indexOf(photo)>0&&<button type="button" disabled={reorderingPhoto} onClick={()=>void movePhoto(photos.indexOf(photo),0)} aria-label="Feature this photo first">Feature</button>}</div><img src={photo.src} alt={photo.alt || 'Graduation photograph'} loading="lazy" />{editingCaption===photo.id?<div className="admin-caption-editor"><input maxLength={200} aria-label="Edit photo caption" value={captionValue} onChange={e=>setCaptionValue(e.target.value)}/><button type="button" disabled={captionBusy} onClick={()=>void saveCaption(photo)}><Check size={15}/> Save</button><button type="button" onClick={()=>setEditingCaption(null)}>Cancel</button></div>:<div className="admin-caption-row"><span>{photo.alt||'Graduation photograph'}</span><button type="button" onClick={()=>{setEditingCaption(photo.id||null);setCaptionValue(photo.alt||'')}} disabled={!photo.id}><Pencil size={14}/> Edit</button><button type="button" className="admin-delete-photo" disabled={!photo.id||deletingPhoto===photo.id} onClick={()=>void deletePhoto(photo)}><Trash2 size={14}/> {deletingPhoto===photo.id?"Deleting…":"Delete"}</button></div>}</div>)}</div>}
            <p className="admin-hint">Use the arrows to arrange photos. The first photo appears first in the public gallery. You can also edit captions or delete photos.</p>
          </section>
        </div>}
        {adminTab==='manage' && <section className="admin-panel admin-sites-panel" aria-labelledby="sites-title">
          <div className="admin-gallery-heading"><h2 id="sites-title">Graduation websites</h2><button type="button" className="admin-small-btn" onClick={() => void refreshSites()}>Load sites</button></div>
          <p className="admin-hint">You are signed in as an administrator. Load sites to manage customer websites. Each graduate gets a separate link on this temporary domain and their own photo gallery.</p>
          {showCreate && <form className="admin-form" onSubmit={createSite}>
            <label htmlFor="graduate-name">Graduate's full name</label><input id="graduate-name" value={graduateName} onChange={e=>setGraduateName(e.target.value)} maxLength={160} required placeholder="e.g. Veronica Daud"/>
            <label htmlFor="graduate-slug">Website URL name</label><input id="graduate-slug" value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))} maxLength={63} required placeholder="e.g. veronica_g"/>
            <label htmlFor="graduate-price">Price (TZS)</label><input id="graduate-price" type="number" min="0" step="1" value={priceTzs} onChange={e=>setPriceTzs(e.target.value)} required/>
            <label htmlFor="graduate-date">Ceremony date (optional)</label><input id="graduate-date" type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)}/>
            <label htmlFor="graduate-time">Time (optional)</label><input id="graduate-time" value={eventTime} onChange={e=>setEventTime(e.target.value)} maxLength={100}/>
            <label htmlFor="graduate-venue">Venue (optional)</label><input id="graduate-venue" value={venue} onChange={e=>setVenue(e.target.value)} maxLength={240}/>
            <label htmlFor="gift-phone">Gift number (optional)</label><input id="gift-phone" value={giftPhone} onChange={e=>setGiftPhone(e.target.value)} placeholder="+255..." maxLength={24}/><label htmlFor="gift-name">Gift recipient name (optional)</label><input id="gift-name" value={giftName} onChange={e=>setGiftName(e.target.value)} maxLength={120}/><label htmlFor="gift-provider">Mobile money provider (optional)</label><input id="gift-provider" value={giftProvider} onChange={e=>setGiftProvider(e.target.value)} placeholder="M-Pesa, Airtel Money…" maxLength={50}/><label htmlFor="graduate-message">Personal message (optional)</label><textarea id="graduate-message" value={siteMessage} onChange={e=>setSiteMessage(e.target.value)} maxLength={3000} rows={3}/>
            <button className="admin-submit" type="submit" disabled={siteBusy}>{siteBusy ? 'Creating…' : 'Create graduation website'}</button>
          </form>}
          {siteError && <p className="admin-error" role="alert">{siteError}</p>}
          {siteNotice && <p className="admin-success" role="status">{siteNotice}</p>}{heroNotice && <p className="admin-success" role="status">{heroNotice}</p>}
          <div className="admin-graduate-selector"><label htmlFor="admin-manage-graduate">Choose a graduate</label><select id="admin-manage-graduate" value={selectedSite||sites[0]?.id||""} onChange={e=>{setSelectedSite(e.target.value);setSiteId(e.target.value)}}><option value="" disabled>Select graduate</option>{sites.map(item=><option key={item.id} value={item.id}>{item.graduateName} · {item.slug}</option>)}</select><span>Manage one graduate at a time. Changes only affect the selected website.</span></div><div className="admin-site-list">{sites.filter(site=>site.id===(selectedSite||sites[0]?.id)).map(site => <div className="admin-site-row" key={site.id}><div className="admin-graduate-identity"><strong>{site.graduateName}</strong><small>{site.slug} · {site.priceTzs.toLocaleString()} TZS</small><small>{site.paymentStatus} / {site.status}</small><a className="admin-site-link" href={`/${site.slug}`} target="_blank" rel="noopener noreferrer">Open website</a></div><div className="admin-graduate-details"><strong>General information</strong>{(()=>{const draft=detailEdits[site.id]??{graduateName:site.graduateName,eventDate:site.eventDate?.slice(0,10)||'',eventTime:site.eventTime||'',venue:site.venue||'',mapsUrl:site.mapsUrl||'',message:site.message||''};return <div className="admin-graduate-fields">{([['graduateName','Graduate name'],['eventDate','Graduation date'],['eventTime','Ceremony time'],['venue','Venue'],['mapsUrl','Google Maps location URL'],['message','Welcome message']] as const).map(([field,label])=><label key={field}>{label}{field==='message'?<textarea rows={3} maxLength={3000} value={draft[field]} onChange={e=>setDetailEdits(prev=>({...prev,[site.id]:{...draft,[field]:e.target.value}}))}/>:<input type={field==='eventDate'?'date':field==='mapsUrl'?'url':'text'} maxLength={field==='graduateName'?160:field==='eventTime'?100:field==='mapsUrl'?1500:240} value={draft[field]} onChange={e=>setDetailEdits(prev=>({...prev,[site.id]:{...draft,[field]:e.target.value}}))}/>}</label>)}<button type="button" disabled={detailSaving===site.id||!detailEdits[site.id]} onClick={()=>void saveGraduateDetails(site)}>{detailSaving===site.id?'Saving…':'Save general information'}</button></div>})()}</div><div className="admin-graduate-music"><strong>Background music</strong><p className="admin-hint">Upload an MP3 (up to 12 MB). Visitors choose whether to play music.</p><input type="file" accept=".mp3,audio/mpeg" aria-label="Upload graduate MP3" onChange={e=>setMusicUploads(prev=>({...prev,[site.id]:e.target.files?.[0]||null}))}/><button type="button" disabled={!musicUploads[site.id]||musicBusy===site.id} onClick={()=>void uploadMusic(site.id)}>{musicBusy===site.id?'Uploading…':'Upload music'}</button><label>Play in section <select value={site.musicSection||'hero'} onChange={e=>void updateSite(site.id,{musicSection:e.target.value})}>{[['hero','Hero'],['details','Event details'],['moments','Gallery'],['rsvp','Wishes form'],['wishes','Public wishes'],['gifts','Gifts'],['all','Entire website']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{site.musicFilename&&<><span className="admin-hint">A music track is uploaded.</span><button type="button" disabled={musicBusy===site.id} onClick={()=>{if(!window.confirm("Remove the background music from this graduate website?"))return;setMusicBusy(site.id);void fetch("/api/admin/sites/"+site.id+"/music",{method:"DELETE"}).then(async r=>{if(!r.ok)throw new Error("Could not remove music");await refreshSites();setSiteNotice("Music removed.")}).catch(e=>setSiteError(e instanceof Error?e.message:"Unable to remove music")).finally(()=>setMusicBusy(null))}}>Remove music</button></>}</div><div className="graduate-preferences"><strong>Website appearance</strong><label>Color theme <select value={site.theme||'maroon'} onChange={e=>void updateSite(site.id,{theme:e.target.value})}><option value="maroon">Classic Maroon</option><option value="forest">Forest Green</option><option value="navy">Midnight Navy</option></select></label><div className="graduate-visibility">{([['showGallery','Photo gallery'],['showWishes','Public wishes'],['showGifts','Gift contact'],['showCountdown','Event countdown']] as const).map(([key,label])=><label key={key}><input type="checkbox" checked={key==='showCountdown'?site[key]===true:site[key]!==false} onChange={e=>void updateSite(site.id,{[key]:e.target.checked})}/>{label}</label>)}</div></div><div className="admin-gift-editor"><strong>Gift number</strong><input aria-label={`Gift number for ${site.graduateName}`} placeholder="+255..." maxLength={24} value={(giftEdits[site.id]?.giftPhone)??(site.giftPhone||'')} onChange={e=>setGiftEdits(prev=>({...prev,[site.id]:{giftPhone:e.target.value,giftName:prev[site.id]?.giftName??site.giftName??'',giftProvider:prev[site.id]?.giftProvider??site.giftProvider??''}}))}/><input aria-label="Gift recipient name" placeholder="Recipient name" maxLength={120} value={giftEdits[site.id]?.giftName??site.giftName??''} onChange={e=>setGiftEdits(prev=>({...prev,[site.id]:{giftPhone:prev[site.id]?.giftPhone??site.giftPhone??'',giftName:e.target.value,giftProvider:prev[site.id]?.giftProvider??site.giftProvider??''}}))}/><input aria-label="Gift mobile money provider" placeholder="Provider (M-Pesa, Airtel Money…)" maxLength={50} value={giftEdits[site.id]?.giftProvider??site.giftProvider??''} onChange={e=>setGiftEdits(prev=>({...prev,[site.id]:{giftPhone:prev[site.id]?.giftPhone??site.giftPhone??'',giftName:prev[site.id]?.giftName??site.giftName??'',giftProvider:e.target.value}}))}/><button type="button" className="admin-small-btn" onClick={()=>void updateSite(site.id,giftEdits[site.id]??{giftPhone:site.giftPhone||'',giftName:site.giftName||'',giftProvider:site.giftProvider||''})}>Save gift details</button></div><div className="admin-gift-methods"><strong>Additional gift methods</strong>{(methodEdits[site.id]??site.giftMethods??[]).map((method,index)=><div className="admin-gift-method" key={index}>{(['provider','account','name'] as const).map(field=><input key={field} aria-label={field+' for gift method '+(index+1)} placeholder={field==='provider'?'M-Pesa / Airtel / Bank':field==='account'?'Number or account':'Recipient name'} maxLength={field==='account'?80:field==='provider'?50:120} value={method[field]} onChange={e=>setMethodEdits(prev=>{const list=[...(prev[site.id]??site.giftMethods??[])];list[index]={...list[index],[field]:e.target.value};return {...prev,[site.id]:list}})}/>)}<button type="button" onClick={()=>setMethodEdits(prev=>({...prev,[site.id]:(prev[site.id]??site.giftMethods??[]).filter((_,i)=>i!==index)}))}>Remove</button></div>)}<div className="admin-gift-method-actions"><button type="button" disabled={(methodEdits[site.id]??site.giftMethods??[]).length>=8} onClick={()=>setMethodEdits(prev=>({...prev,[site.id]:[...(prev[site.id]??site.giftMethods??[]),{provider:'',account:'',name:''}]}))}>+ Add method</button><button type="button" onClick={()=>void updateSite(site.id,{giftMethods:(methodEdits[site.id]??site.giftMethods??[]).filter(m=>m.provider.trim()&&m.account.trim())})}>Save methods</button></div></div><div className="admin-hero-upload"><label>Hero portrait<input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/heif" onChange={e=>setHeroFiles(prev=>({...prev,[site.id]:e.target.files?.[0] || null}))}/></label><button type="button" disabled={heroBusy===site.id} onClick={()=>void uploadHero(site.id)}>{heroBusy===site.id ? "Uploading…" : "Upload hero photo"}</button></div><div className="admin-site-actions"><strong>Website status</strong><button type="button" onClick={() => void updateSite(site.id, { paymentStatus: site.paymentStatus === 'paid' ? 'pending' : 'paid' })}>{site.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}</button><button type="button" onClick={() => void updateSite(site.id, { status: site.status === 'active' ? 'suspended' : 'active' })}>{site.status === 'active' ? 'Suspend' : 'Activate'}</button></div></div>)}</div>
        </section>}
      </div>
    </main>
  )
}
