import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANTE: Sostituisci '/NutriAI-Pro/' con il nome esatto del tuo repository GitHub tra due slash.
  // Questo risolve i problemi di caricamento degli asset (404).
  base: '/NutriAI-Pro/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})
