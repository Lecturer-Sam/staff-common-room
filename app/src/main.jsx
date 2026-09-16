import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/hearth.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SubscriptionProvider } from './context/SubscriptionContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { Analytics } from '@vercel/analytics/react';
import { registerServiceWorker } from './registerSW.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ToastProvider>
          <SubscriptionProvider>
            <App />
          </SubscriptionProvider>
          <Analytics />
        </ToastProvider>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)

registerServiceWorker()