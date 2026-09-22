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
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,mp4}'],
      },
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: 'GestArt',
        short_name: 'GestArt',
        description: 'Application GestArt pour la gestion des interventions et de la comptabilité',
        theme_color: '#556B2F',
        background_color: '#F2F0EB',
        display: "standalone",
        start_url: "/home",
        scope: "/",
        icons: [
          {
            src: '/Logo-transparent.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/Logo-transparent.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    })
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
