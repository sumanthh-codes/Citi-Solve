import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to the backend during local dev so the browser sees a
    // single origin (http://localhost:5173). This lets the httpOnly auth
    // cookies work in dev exactly as they do in production behind the Vercel
    // rewrite — no cross-origin, no localStorage token needed.
    // Leave VITE_BACKEND_URL empty locally so requests stay relative ('/api/...').
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
