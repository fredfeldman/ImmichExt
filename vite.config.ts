import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const configuredImmichUrl = process.env.VITE_IMMICH_URL?.trim()
const immichServerUrl = configuredImmichUrl || 'http://192.168.50.18:2283'
const proxyTarget = immichServerUrl.replace(/\/api\/?$/, '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
})
