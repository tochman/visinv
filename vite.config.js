import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import istanbul from 'vite-plugin-istanbul'

const isCoverage = process.env.CYPRESS_COVERAGE === 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Only add istanbul plugin when running with coverage
    ...(isCoverage ? [istanbul({
      include: 'src/**/*',
      exclude: ['node_modules', 'cypress', '**/*.test.*', '**/*.spec.*'],
      extension: ['.js', '.jsx'],
      requireEnv: true,
      cypress: true,
    })] : []),
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    sourcemap: isCoverage,
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
