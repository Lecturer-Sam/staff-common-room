// Registers the service worker in production builds only.
// In dev we skip it so Vite's HMR and module graph aren't served from cache.
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // When an updated worker has installed and there's already a controller,
        // activate it immediately so users get the new build on next load.
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing
          if (!sw) return
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              sw.postMessage('SKIP_WAITING')
            }
          })
        })
      })
      .catch(() => {
        // Registration failures are non-fatal — the app still works online.
      })
  })

  // Reload once when a new worker takes control, so the fresh assets are used.
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
