import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'
import AdminLogin from './AdminLogin.tsx'
import GraduateGuests from './GraduateGuests.tsx'

const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname === '/admin/login' ? <AdminLogin /> : pathname === '/admin' ? <Admin /> : /^\/g\/(?:[a-f0-9]{20}|[a-f0-9]{64}|[a-z0-9-]{3,63}-[a-f0-9]{20})$/.test(pathname) ? <GraduateGuests /> : <App />}
  </StrictMode>,
)
