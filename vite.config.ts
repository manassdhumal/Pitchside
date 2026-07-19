import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 5173 is this project's canonical dev port. An explicit PORT (e.g. from preview tooling)
    // can still override it, but otherwise the server always binds 5173 and fails loudly if it's
    // taken (strictPort) rather than silently drifting to 5174.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    // Proxy the accounts API to the local backend so the browser talks same-origin in dev (no CORS,
    // and the session cookie is set on the 5173 origin). In production the frontend calls VITE_API_URL.
    proxy: {
      '/api': { target: process.env.API_ORIGIN ?? 'http://localhost:3001', changeOrigin: true },
    },
    // The scraper pipeline (scripts/scrape) continuously writes into this directory in the
    // background; without this, every scraped file triggers a dev-server full reload
    // mid-session (public/ changes normally cause one). Function form because glob patterns
    // don't reliably match Windows backslash paths.
    watch: {
      ignored: (path: string) => path.replace(/\\/g, '/').includes('/public/data/historical/'),
    },
  },
})
