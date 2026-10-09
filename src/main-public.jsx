import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './public-site/public.css'
import PublicRouter from './PublicRouter'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PublicRouter />
  </StrictMode>,
)
