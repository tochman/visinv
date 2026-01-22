import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux': ['@reduxjs/toolkit', 'react-redux'],
          'supabase': ['@supabase/supabase-js'],
          'pdf': ['handlebars'],
          'i18n': ['i18next', 'react-i18next'],
          'prism': ['prismjs']
        }
      }
    }
  }
})
