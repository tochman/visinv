import { defineConfig } from 'cypress'
import codeCoverage from '@cypress/code-coverage/task.js'

export default defineConfig({
  e2e: {
    experimentalPromptCommand: true,
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    retries: {
      runMode: 1, // Retry failed tests up to 2 times in CI/headless mode
      openMode: 0, // No retries in interactive mode
    },
    numTestsKeptInMemory: 0, // Optimize memory for parallel execution
    experimentalMemoryManagement: true, // Enable memory management
    env: {
      SUPABASE_PROJECT_REF: 'huuytzuocdtgedlmmccx',
      codeCoverage: {
        exclude: ['cypress/**/*.*'],
        expectFrontendCoverageOnly: true,
      },
    },
    setupNodeEvents(on, config) {
      codeCoverage(on, config)
      return config
    },
  },
})
