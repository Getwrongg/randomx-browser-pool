import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Serve COOP/COEP headers for SharedArrayBuffer
const securityHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp'
}

export default defineConfig({
  plugins: [react()],
  server: {
    headers: securityHeaders,
    port: 5173
  },
  preview: {
    headers: securityHeaders,
    port: 5174
  },
  build: {
    target: 'esnext'
  }
})
