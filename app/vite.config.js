import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// MATERIALS_TARGET: where the Python document generators live. In dev this is
// the local service (`python service/main.py`, port 8080); in production the
// app uses VITE_MATERIALS_URL instead and this proxy is unused.
const MATERIALS_TARGET =
  process.env.MATERIALS_TARGET || 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    // Vite blocks unknown hosts by default, which stops the hosted dev preview
    // from loading. Dev-server only — this has no effect on `vite build`.
    allowedHosts: true,
    proxy: {
      // Keeps the browser on a single origin, so no CORS setup is needed.
      '/materials': {
        target: MATERIALS_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/materials/, ''),
      },
    },
  },
})
