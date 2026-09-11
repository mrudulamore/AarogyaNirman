import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow access via Cloudflare Tunnel (trycloudflare.com) hostnames for sharing the local dev server.
    allowedHosts: ['.trycloudflare.com'],
  },
})
