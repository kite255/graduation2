import { useState, type FormEvent } from 'react'
import { GraduationCap, LockKeyhole, ArrowRight } from 'lucide-react'
import './Admin.css'

export default function AdminLogin() {
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true);setError('')
    try {
      const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({email,password})})
      const data=await res.json()
      if(!res.ok)throw new Error(data.message || 'Unable to sign in')
      window.location.assign('/admin')
    } catch(e){setError(e instanceof Error?e.message:'Unable to sign in')}
    finally{setBusy(false)}
  }
  return <main className="admin-login-page"><div className="admin-login-card">
    <a className="admin-login-home" href="/"><GraduationCap size={23}/> GRADUATION WEBSITE</a>
    <div className="admin-login-heading"><span>ADMINISTRATION</span><h1>Welcome <em>back.</em></h1><p>Sign in to manage graduation websites, customer payments and photo galleries.</p></div>
    <form className="admin-form" onSubmit={submit}>
      <label htmlFor="login-email">Email address</label><input id="login-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@example.com"/>
      <label htmlFor="login-password">Password</label><input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Your admin password"/>
      {error && <p className="admin-error" role="alert">{error}</p>}
      <button type="submit" className="admin-submit" disabled={busy}><LockKeyhole size={17}/>{busy?'Signing in…':'Sign in'}<ArrowRight size={17}/></button>
    </form>
    <p className="admin-hint">Authorized administrators only · HTTPS connection required</p>
  </div></main>
}
