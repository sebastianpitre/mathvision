import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Servidor local para `npm run dev` (carpeta servidor/, PORT del
// servidor/.env). El navegador habla con Vite y Vite reenvía la
// API y Socket.IO, igual que en producción: todo en el mismo dominio.
const SERVIDOR_LOCAL = process.env.SERVIDOR_LOCAL || 'http://localhost:3000'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': SERVIDOR_LOCAL,
      '/socket.io': { target: SERVIDOR_LOCAL, ws: true },
    },
  },
  build: {
    // Las pantallas con 3D (Three.js + personajes) se cargan
    // aparte, solo cuando se abren (ver routes/AppRouter.jsx).
    chunkSizeWarningLimit: 1500,
  },
})
