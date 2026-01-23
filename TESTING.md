# Testing Guide for visinv

## Overview

This guide covers how to run, write, and maintain tests for the visinv invoice management application.

## Test Framework

- **E2E Testing:** Cypress 15.9.0
- **Code Coverage:** @cypress/code-coverage with nyc
- **Mocking:** Cypress intercept for API mocking
- **Test Files:** Located in `cypress/e2e/`

## Running Tests

### Interactive Mode (Development)
```bash
# Open Cypress Test Runner with UI
npm run cy:open

# This opens an interactive browser where you can:
# - Select and run individual test files
# - See tests execute in real-time
# - Debug failing tests with browser DevTools
# - Hot-reload tests as you edit them
```

### Headless Mode (CI/CD)
```bash
# Run all tests headlessly
npm run cy:run

# Run specific test file
npm run cy:run -- --spec "cypress/e2e/clients.cy.js"

# Run tests matching a pattern
npm run cy:run -- --spec "cypress/e2e/**/invoice*.cy.js"

# Run with code coverage
npm run test:coverage

# View coverage report
npm run coverage:report
open coverage/index.html
```

### Running Specific Test Suites
```bash
# Core features
npm run cy:run -- --spec "cypress/e2e/{clients,invoices,products}.cy.js"

# Admin features
npm run cy:run -- --spec "cypress/e2e/admin*.cy.js"

# Compliance tests
npm run cy:run -- --spec "cypress/e2e/swedish-compliance.cy.js"
```

## Test Structure

### Directory Layout
```
cypress/
├── e2e/                          # Test files
│   ├── clients.cy.js            # Client management tests
│   ├── invoices.cy.js           # Invoice tests
│   ├── products.cy.js           # Product catalog tests
│   ├── organizations.cy.js      # Organization setup tests
│   ├── swedish-compliance.cy.js # Legal compliance tests
│   ├── admin-dashboard.cy.js    # Admin features
│   ├── admin-users.cy.js        # User management
│   ├── credit-invoices.cy.js    # Credit invoice tests
│   ├── invoice-templates.cy.js  # Template tests
│   ├── member-invitations.cy.js # Team collaboration
│   └── manual-invoice-numbering.cy.js
├── fixtures/                     # Test data
│   ├── organizations.json
│   ├── clients.json
│   └── invoice_templates_rows.json
├── support/                      # Helpers and commands
│   ├── commands.js              # Custom Cypress commands
│   └── e2e.js                   # Global configuration
└── cypress.config.js             # Cypress configuration
```

### Test File Structure
```javascript
/// <reference types="cypress" />

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup: Mock APIs, login, navigate
    cy.intercept('GET', '**/rest/v1/resource*', {
      statusCode: 200,
      body: []
    }).as('getResource')
    
    cy.login('user')  // Use custom login command
    cy.visit('/page')
    cy.wait('@getResource')
  })

  describe('Happy Path - Success Scenarios', () => {
    it('should successfully create a resource', () => {
      // Arrange
      cy.get('[data-cy="create-button"]').click()
      
      // Act
      cy.get('[data-cy="name-input"]').type('Test Name')
      cy.get('[data-cy="save-button"]').click()
      
      // Assert
      cy.wait('@createResource')
      cy.contains('Test Name').should('be.visible')
    })
  })

  describe('Sad Path - Error Scenarios', () => {
    it('should show validation error for empty form', () => {
      cy.get('[data-cy="create-button"]').click()
      cy.get('[data-cy="save-button"]').click()
      
      cy.get('[data-cy="form-error"]').should('be.visible')
    })
  })
})
```

## Writing Tests

### Best Practices ✅

#### 1. Use Data-Cy Attributes
```javascript
// ✅ Good - Stable, explicit selector
cy.get('[data-cy="create-client-button"]').click()

// ❌ Bad - Fragile, can break with styling changes
cy.get('.btn-primary.mt-4').click()

// ❌ Bad - Breaks with i18n or text changes
cy.contains('Create Client').click()
```

#### 2. Wait for API Responses
```javascript
// ✅ Good - Wait for specific API call
cy.intercept('POST', '**/clients*').as('createClient')
cy.get('[data-cy="save-button"]').click()
cy.wait('@createClient')

// ❌ Bad - Arbitrary wait (slow and brittle)
cy.get('[data-cy="save-button"]').click()
cy.wait(2000)
```

#### 3. Use Conditional Assertions
```javascript
// ✅ Good - Waits automatically with retry
cy.get('[data-cy="success-message"]', { timeout: 5000 })
  .should('be.visible')

// ❌ Bad - Fixed wait before checking
cy.wait(1000)
cy.get('[data-cy="success-message"]').should('be.visible')
```

#### 4. Isolate Tests with Mocks
```javascript
// ✅ Good - Each test has clean state
beforeEach(() => {
  cy.intercept('GET', '**/clients*', {
    statusCode: 200,
    body: []
  }).as('getClients')
  
  cy.login('user')
})

// ❌ Bad - Tests depend on database state
it('should list clients', () => {
  cy.visit('/clients')
  cy.get('[data-cy="client-row"]').should('have.length', 5)  // Fragile!
})
```

#### 5. Use Custom Commands
```javascript
// ✅ Good - Reusable, maintainable
cy.login('admin')
cy.fillClientForm({ name: 'Test Client', email: 'test@example.com' })

// ❌ Bad - Repeated code, harder to maintain
cy.visit('/')
cy.get('[data-cy="email-input"]').type('admin@test.com')
cy.get('[data-cy="password-input"]').type('password')
cy.get('[data-cy="login-button"]').click()
```

### Available Custom Commands

#### Authentication
```javascript
// Login as different user types
cy.login('admin')      // Admin user with full permissions
cy.login('user')       // Regular user
cy.login('premium_user')  // Premium subscription user
cy.login('visitor')    // No authentication (visitor)

// Login with custom options
cy.login('admin', {
  skipOrgMock: true,  // Don't mock organization data
  customOrganization: { id: 'org-1', name: 'Custom Org' }
})

// Logout
cy.logout()
```

#### Form Helpers
```javascript
// Fill client form with data
cy.fillClientForm({
  name: 'Test Client',
  email: 'test@example.com',
  phone: '+46 70 123 4567',
  address: 'Test Street 1',
  city: 'Stockholm',
  postalCode: '111 22',
  country: 'Sweden',
  orgNumber: '556123-4567',
  vatNumber: 'SE556123456701',
  contactPerson: 'John Doe',
  notes: 'Important client'
})
```

#### Selectors
```javascript
// Shorthand for data-cy selectors
cy.getByCy('create-button')  // Same as cy.get('[data-cy="create-button"]')
```

#### Redux Store (if needed)
```javascript
// Access Redux store
cy.getStore()
cy.dispatch({ type: 'ACTION_TYPE', payload: data })
cy.getState().then(state => {
  // Assert on state
})
```

### Test Naming Convention

Use descriptive test names with "should" or "is expected to":

```javascript
// ✅ Good - Clear what behavior is tested
it('should display validation error when email format is invalid', () => {})
it('is expected to create invoice and display in list', () => {})
it('should prevent duplicate invoice numbers in manual mode', () => {})

// ❌ Bad - Vague or unclear
it('test email validation', () => {})
it('works correctly', () => {})
it('invoice creation', () => {})
```

### Test Organization

Group related tests with nested `describe` blocks:

```javascript
describe('Client Management', () => {
  describe('Happy Path - Creating Clients', () => {
    it('should create client with only required fields', () => {})
    it('should create client with all fields', () => {})
  })

  describe('Sad Path - Validation Errors', () => {
    it('should show error for empty name', () => {})
    it('should show error for invalid email', () => {})
  })

  describe('Happy Path - Editing Clients', () => {
    it('should open edit modal with prefilled data', () => {})
    it('should update client successfully', () => {})
  })

  describe('Sad Path - Network Errors', () => {
    it('should handle network timeout gracefully', () => {})
  })
})
```

## Mocking API Calls

### Basic Intercept
```javascript
// Mock a GET request
cy.intercept('GET', '**/rest/v1/clients*', {
  statusCode: 200,
  body: [
    { id: '1', name: 'Client 1' },
    { id: '2', name: 'Client 2' }
  ]
}).as('getClients')

// Use in test
cy.visit('/clients')
cy.wait('@getClients')
```

### Dynamic Response
```javascript
// Mock POST with dynamic response
cy.intercept('POST', '**/rest/v1/clients*', (req) => {
  req.reply({
    statusCode: 201,
    body: {
      id: 'new-id',
      ...req.body,
      created_at: new Date().toISOString()
    }
  })
}).as('createClient')
```

### Error Simulation
```javascript
// Simulate network error
cy.intercept('POST', '**/rest/v1/clients*', {
  forceNetworkError: true
}).as('networkError')

// Simulate server error
cy.intercept('POST', '**/rest/v1/clients*', {
  statusCode: 500,
  body: { error: 'Internal server error' }
}).as('serverError')

// Simulate timeout
cy.intercept('POST', '**/rest/v1/clients*', {
  delay: 30000,
  statusCode: 200,
  body: {}
}).as('slowRequest')
```

## Debugging Tests

### Using Cypress Test Runner
1. Run `npm run cy:open`
2. Click on a test file
3. Use browser DevTools to inspect elements
4. Click on command in Cypress runner to see state at that point
5. Use `cy.pause()` to pause execution

### Console Logging
```javascript
// Log to Cypress command log
cy.log('Debug message')

// Access element and log
cy.get('[data-cy="total"]').then($el => {
  cy.log('Total value:', $el.text())
})

// Log API response
cy.wait('@createInvoice').then(interception => {
  cy.log('API Response:', interception.response.body)
})
```

### Debugging Flaky Tests
```javascript
// Increase timeout for specific assertion
cy.get('[data-cy="slow-element"]', { timeout: 10000 })
  .should('be.visible')

// Add explicit waits for animations
cy.get('[data-cy="modal"]').should('be.visible')
cy.get('[data-cy="modal"]').should('have.class', 'animate-in')

// Wait for element to stop moving
cy.get('[data-cy="dropdown"]').should('be.visible')
cy.wait(300)  // Only if absolutely necessary for animations
```

## Code Coverage

### Generate Coverage Report
```bash
# Run tests with coverage instrumentation
CYPRESS_COVERAGE=true npm run dev  # In one terminal
npm run test:coverage              # In another terminal

# Generate and view report
npm run coverage:report
open coverage/index.html
```

### Coverage Thresholds
Current settings (in `package.json`):
```json
"nyc": {
  "lines": 50,
  "statements": 50,
  "functions": 50,
  "branches": 50
}
```

Target: Increase to 70%+ coverage

### Exclude Files from Coverage
Files excluded from coverage:
- `src/main.jsx` - Application entry point
- `src/**/*.test.js` - Test files
- `src/**/*.spec.js` - Spec files

## Continuous Integration

### GitHub Actions (Planned)
```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [pull_request]

jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run dev &
      - run: npx wait-on http://localhost:5173
      - run: npm run cy:run
      - uses: codecov/codecov-action@v3
        if: always()
```

## Common Issues & Solutions

### Issue: "cypress: not found"
```bash
# Install Cypress binary
npx cypress install
npx cypress verify
```

### Issue: Tests timing out
```javascript
// Increase default timeout in cypress.config.js
{
  e2e: {
    defaultCommandTimeout: 10000,  // 10 seconds
    pageLoadTimeout: 60000,        // 1 minute
    requestTimeout: 10000          // 10 seconds
  }
}
```

### Issue: Element not found
```javascript
// ✅ Add proper wait
cy.wait('@apiCall')
cy.get('[data-cy="element"]').should('be.visible')

// ✅ Increase timeout
cy.get('[data-cy="element"]', { timeout: 10000 })
  .should('be.visible')
```

### Issue: Tests pass locally but fail in CI
```javascript
// Common causes:
// 1. Race conditions - add proper waits
// 2. Different viewport size - set viewport explicitly
cy.viewport(1280, 720)

// 3. Timing issues - avoid arbitrary waits
// 4. Environment variables - check CI env vars
```

## Test Metrics

Current test suite statistics:
- **Total Test Files:** 11
- **Estimated Test Cases:** ~298
- **Code Coverage:** ~50%
- **Execution Time:** ~6-8 minutes (optimized)
- **Flaky Tests:** <1%

## Contributing

### Before Submitting PR
1. Run full test suite: `npm run cy:run`
2. Check code coverage: `npm run test:coverage`
3. Ensure no flaky tests
4. Add tests for new features
5. Update this guide if needed

### Code Review Checklist
- [ ] Tests use `data-cy` attributes
- [ ] No arbitrary `cy.wait(ms)` calls
- [ ] Proper API mocking with intercepts
- [ ] Clear test names and organization
- [ ] Tests are isolated and independent
- [ ] No hardcoded credentials or sensitive data

## Resources

### Documentation
- [Cypress Official Docs](https://docs.cypress.io)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress API Reference](https://docs.cypress.io/api/table-of-contents)

### Internal Docs
- `CYPRESS_TEST_REVIEW.md` - Comprehensive test analysis
- `TEST_IMPROVEMENTS_PLAN.md` - Improvement roadmap
- `cypress/support/commands.js` - Custom command implementations

### Community
- [Cypress Discord](https://discord.com/invite/cypress)
- [Cypress GitHub Discussions](https://github.com/cypress-io/cypress/discussions)

---

**Last Updated:** 2026-01-23  
**Maintained By:** Development Team  
**Questions?** Check the docs or ask in team chat
