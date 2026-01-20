import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    env: {
      SUPABASE_PROJECT_REF: 'huuytzuocdtgedlmmccx'
    },
    setupNodeEvents(on, config) {
    },
  },
})
