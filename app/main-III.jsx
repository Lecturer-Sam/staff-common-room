import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import './index.css'
import { seedIfStale } from './db/seed'
import { AuthProvider } from './contexts/AuthContext'

async function bootstrap() {
  try {
    await seedIfStale()
  } catch (err) {
    console.error('[bootstrap] seed failed:', err)
  }
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </StrictMode>,
  )
}

bootstrap()