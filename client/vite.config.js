import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'CRM Client',
        short_name: 'CRM',
        description: 'Client application for CRM',
        theme_color: '#556B2F',
        background_color: '#F2F0EB',
        display: "standalone",
        start_url: "/home",
        scope: "/",
        icons: [
          {
            src: '/colored-logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/colored-logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    })
  ],
  server: {
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
