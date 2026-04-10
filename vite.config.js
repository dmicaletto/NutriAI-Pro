import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
  },
  // './' usa percorsi relativi: compatibile con GitHub Pages e Capacitor Android.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
