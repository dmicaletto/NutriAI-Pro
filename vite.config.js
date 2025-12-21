import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Importante per GitHub Pages: il base path deve essere il nome del repository
  // Se il tuo repo si chiama "mio-nutrizionista", metti '/mio-nutrizionista/'
  // Se usi un dominio personalizzato, lascia '/'
  base: './', 
})
