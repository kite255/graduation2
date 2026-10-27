import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ImagePlus, LockKeyhole, ShieldCheck, UploadCloud } from 'lucide-react'
import './Admin.css'

type Photo = { id?: string; src: string; alt: string }

export default function Admin() {
  const [token, setToken] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [alt, setAlt] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [galleryError, setGalleryError] = useState(false)

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

  useEffect(() => { void refreshGallery() }, [])

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!token.trim()) { setError('Enter your admin API token.'); return }
    if (!file) { setError('Select a photo first.'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Select an image smaller than 8 MB.'); return }
    setBusy(true)
    try {
      const payload = new FormData()
      payload.append('image', file)
      payload.append('alt', alt.trim() || 'Graduation memory')
      const response = await fetch('/api/admin/gallery', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token.trim()}` },
        body: payload,
      })
      const result: { message?: string } = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(response.status === 401
        ? 'Invalid admin token. Check your Coolify ADMIN_API_TOKEN.'
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

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <a href="/" className="admin-back"><ArrowLeft size={18} /> Back to website</a>
        <span className="admin-label"><ShieldCheck size={16} /> PHOTO MANAGEMENT</span>
      </header>
      <div className="admin-wrap">
        <div className="admin-heading">
          <span className="admin-eyebrow">GRADUATION WEBSITE · ADMIN</span>
          <h1>Manage your <em>memories.</em></h1>
          <p>Upload graduation photographs directly to your website. Photos appear in the public gallery after a successful upload.</p>
        </div>
        <div className="admin-columns">
          <section className="admin-panel" aria-labelledby="upload-title">
            <h2 id="upload-title"><ImagePlus size={22} /> Upload a photo</h2>
            <form onSubmit={handleUpload} className="admin-form">
              <label htmlFor="admin-token">Admin API token</label>
              <div className="admin-token-row"><LockKeyhole size={17}/><input id="admin-token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your private token" required /></div>
              <p className="admin-hint">Use the ADMIN_API_TOKEN from Coolify. It is kept only in this page's memory and is not saved in your browser.</p>
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
        </div>
      </div>
    </main>
  )
}
