import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' -> rutas relativas para que funcione en GitHub Pages
// (subcarpeta /repo/) sin configurar el nombre del repo.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    // Permite acceder desde el túnel de ngrok (host distinto a localhost)
    // durante pruebas en el celular. Solo afecta al servidor de desarrollo.
    allowedHosts: true,
  },
})
