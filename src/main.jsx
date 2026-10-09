import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { NotificationProvider } from './context/NotificationContext'
import { AuthProvider } from './context/AuthContext'
import { ModalProvider } from './context/ModalContext'
import { SimpleErrorBoundary } from './components/SimpleErrorBoundary'

import { DialogProvider } from './context/DialogContext'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SimpleErrorBoundary>
      <AuthProvider>
        <DialogProvider>
          <NotificationProvider>
            <ModalProvider>
              <App />
            </ModalProvider>
          </NotificationProvider>
        </DialogProvider>
      </AuthProvider>
    </SimpleErrorBoundary>
  </StrictMode>,
)
