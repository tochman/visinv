// ***********************************************************
// This support/e2e.js file is processed and loaded automatically
// before your test files.
//
// This is a great place to put global configuration and behavior
// that modifies Cypress.
// ***********************************************************

import './commands'
import '@cypress/code-coverage/support'

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, _runnable) => {
  // Return false to prevent the error from failing the test
  // You can add conditions here if you want to fail on specific errors
  console.log('Uncaught exception:', err.message)
  return false
})
