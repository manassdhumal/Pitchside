import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The scraper pipeline (scripts/scrape) continuously writes into this directory in the
    // background; without this, every scraped file triggers a dev-server full reload
    // mid-session (public/ changes normally cause one). Function form because glob patterns
    // don't reliably match Windows backslash paths.
    watch: {
      ignored: (path: string) => path.replace(/\\/g, '/').includes('/public/data/historical/'),
    },
  },
})
