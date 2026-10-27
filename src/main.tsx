import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Admin from './Admin.tsx'
import AdminLogin from './AdminLogin.tsx'

const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {pathname === '/admin/login' ? <AdminLogin /> : pathname === '/admin' ? <Admin /> : <App />}
  </StrictMode>,
)
