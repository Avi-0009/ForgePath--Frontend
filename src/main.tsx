import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AccountScopedQueryCache from './components/auth/AccountScopedQueryCache.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccountScopedQueryCache>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AccountScopedQueryCache>
  </StrictMode>,
)
