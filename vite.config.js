import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' -> rutas relativas para que funcione en GitHub Pages
// (subcarpeta /repo/) sin configurar el nombre del repo.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Esmeraldas · Diagnóstico de Colorimetría',
        short_name: 'Esmeraldas Diagnóstico',
        description: 'Gestión de clientes y diagnóstico de colorimetría — Esmeraldas Salón & Spa.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#ecebe6',
        background_color: '#ecebe6',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo cachea el shell de la app (JS/CSS/HTML/íconos) para que abra
        // instalada aunque no haya red. Los datos (clientes, visitas, fotos)
        // van a script.google.com/drive.google.com — otro origen, así que
        // Workbox no los toca: siempre se piden a la red, nunca quedan
        // desactualizados en caché.
        globPatterns: ['**/*.{js,css,html,png,ico,svg}'],
        // Tipografía Archivo (Google Fonts): se guarda en caché al primer uso
        // para que las siguientes aperturas no esperen a la red y la app
        // instalada se vea igual sin conexión. Solo estos dos orígenes de
        // fuentes; el resto de las requests (datos) no se toca.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: './',
  server: {
    // Permite acceder desde el túnel de ngrok (host distinto a localhost)
    // durante pruebas en el celular. Solo afecta al servidor de desarrollo.
    allowedHosts: true,
  },
})
