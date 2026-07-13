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
        short_name: 'Esmeraldas',
        description: 'Gestión de clientes y diagnóstico de colorimetría — Esmeraldas Salón & Spa.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        theme_color: '#e0518f',
        background_color: '#fafafa',
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
