import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { seedIfNeeded } from './db/seed'

/**
 * Boot sequence:
 *  1. Seed IndexedDB from /data/*.json (skips instantly if already done)
 *  2. Mount React
 *
 * The seed is awaited BEFORE render so every route can assume the
 * database is populated on first paint.
 */
async function boot() {
  try {
    const { seeded, counts } = await seedIfNeeded({
      onProgress: (msg) => console.info('[seed]', msg),
    })
    if (seeded) {
      console.info('[seed] complete', counts)
    }
  } catch (err) {
    // Don't block the UI — log the error and continue.
    // The app will show empty states gracefully when Dexie queries return [].
    console.error('[seed] failed, continuing without data:', err)
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()
