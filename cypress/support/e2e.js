// ***********************************************************
// This support/e2e.js file is processed and loaded automatically
// before your test files.
//
// This is a great place to put global configuration and behavior
// that modifies Cypress.
// ***********************************************************

import './commands'
import '@cypress/code-coverage/support'

// Cookie consent value to set for all tests (except cookie consent tests)
const COOKIE_CONSENT = JSON.stringify({
  essential: true,
  analytics: true,
  marketing: false,
  preferences: true,
  timestamp: new Date().toISOString()
});

// Override cy.visit to automatically set cookie consent before page load
// This prevents the cookie banner from blocking UI interactions
Cypress.Commands.overwrite('visit', (originalFn, url, options = {}) => {
  const testFile = Cypress.spec.name;
  
  // Skip setting cookie consent for cookie consent tests
  if (testFile === 'cookie-consent.cy.js') {
    return originalFn(url, options);
  }
  
  // Merge our onBeforeLoad with any existing one
  const existingOnBeforeLoad = options.onBeforeLoad;
  
  return originalFn(url, {
    ...options,
    onBeforeLoad(win) {
      // Set cookie consent in localStorage
      win.localStorage.setItem('visinv_cookie_consent', COOKIE_CONSENT);
      
      // Call existing onBeforeLoad if provided
      if (existingOnBeforeLoad) {
        existingOnBeforeLoad(win);
      }
    }
  });
});

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, _runnable) => {
  // Return false to prevent the error from failing the test
  // You can add conditions here if you want to fail on specific errors
  console.log('Uncaught exception:', err.message)
  return false
})
