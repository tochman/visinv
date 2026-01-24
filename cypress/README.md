# Cypress E2E Testing Guide

## Overview

This project uses Cypress for end-to-end testing. We've implemented a DRY (Don't Repeat Yourself) pattern to reduce duplication in test setup by centralizing common API mocks and intercepts.

## Common Intercepts Pattern

### The `setupCommonIntercepts()` Command

To reduce duplication, we've created a custom Cypress command `setupCommonIntercepts()` that sets up commonly used API intercepts. This command is defined in `cypress/support/commands.js`.

### Usage

```javascript
describe('My Feature Tests', () => {
  beforeEach(() => {
    cy.login('admin')
    
    // Set up common intercepts with default empty arrays
    cy.setupCommonIntercepts()
    
    cy.visit('/my-page')
  })
})
```

### Available Options

The `setupCommonIntercepts()` command accepts an options object to customize the mock data:

```javascript
cy.setupCommonIntercepts({
  invoices: [],        // Mock data for GET **/rest/v1/invoices*
  clients: [],         // Mock data for GET **/rest/v1/clients*
  products: [],        // Mock data for GET **/rest/v1/products*
  templates: [],       // Mock data for GET **/rest/v1/invoice_templates*
  organizations: null, // Mock data for GET **/rest/v1/organizations*
  organizationMembers: null, // Mock data for GET **/rest/v1/organization_members*
  defaultOrganization: null  // Mock data for GET **/rest/v1/organization_members*is_default=eq.true*
})
```

### Skipping Intercepts

To skip an intercept (not set it up at all), pass `null` for that option:

```javascript
cy.setupCommonIntercepts({
  invoices: [],
  clients: [],
  products: null,  // Skip products intercept
  templates: null  // Skip templates intercept
})
```

### Overriding Data in Nested Blocks

You can override the intercepts in nested `describe` or `it` blocks:

```javascript
describe('Product Management', () => {
  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts()
    cy.visit('/products')
  })
  
  describe('With Existing Products', () => {
    beforeEach(() => {
      // Override products with test data
      cy.setupCommonIntercepts({
        products: [
          { id: 'p1', name: 'Product 1', price: 100 },
          { id: 'p2', name: 'Product 2', price: 200 }
        ]
      })
      cy.visit('/products')
    })
    
    it('displays products', () => {
      // Test with the mock products
    })
  })
})
```

### Automatic Aliases

The command automatically creates aliases for all intercepts:
- `@getInvoices`
- `@getClients`
- `@getProducts`
- `@getTemplates`
- `@getOrganizations`
- `@getOrganizationMembers`
- `@getDefaultOrganization`

You can use these aliases with `cy.wait()`:

```javascript
cy.setupCommonIntercepts()
cy.visit('/invoices')
cy.wait('@getInvoices')
```

## When to Use vs. Custom Intercepts

### Use `setupCommonIntercepts()` for:
- GET requests to common resources (invoices, clients, products, templates)
- Standard list/collection endpoints
- When you need empty arrays or simple mock data

### Use custom `cy.intercept()` for:
- POST, PATCH, DELETE requests
- Dynamic responses based on request body
- Complex response logic
- Test-specific error scenarios
- Admin-specific endpoints
- Special query parameters or filters

## Example Test File

```javascript
/// <reference types="cypress" />

describe('Invoice Management', () => {
  const mockClient = {
    id: 'client-1',
    name: 'Test Client',
    email: 'test@example.com'
  }
  
  beforeEach(() => {
    cy.login('admin')
    
    // Set up common intercepts with defaults
    cy.setupCommonIntercepts({
      invoices: [],
      clients: [mockClient],
      templates: [],
      products: []
    })
    
    // Add test-specific POST intercepts
    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      req.reply({
        statusCode: 201,
        body: { id: 'new-invoice', ...req.body }
      })
    }).as('createInvoice')
    
    cy.visit('/invoices')
    cy.wait('@getInvoices')
  })
  
  it('creates an invoice', () => {
    cy.getByCy('create-invoice-button').click()
    cy.getByCy('client-select').select(mockClient.id)
    cy.getByCy('save-button').click()
    cy.wait('@createInvoice')
  })
})
```

## Benefits

1. **Less Duplication**: Reduces ~60% of repetitive intercept setup code
2. **Centralized Configuration**: Common mocks are defined in one place
3. **Easier Maintenance**: Update common patterns once, apply everywhere
4. **Flexibility**: Override defaults when needed for specific tests
5. **Consistency**: All tests use the same mock structure

## Migration Guide

When updating existing tests to use this pattern:

1. Identify GET intercepts that match the common patterns
2. Replace them with `cy.setupCommonIntercepts()`
3. Pass custom data via the options object
4. Keep POST/PATCH/DELETE intercepts as custom
5. Update `cy.wait()` calls to use the new aliases

### Before:
```javascript
beforeEach(() => {
  cy.login('admin')
  
  cy.intercept('GET', '**/rest/v1/clients*', {
    statusCode: 200,
    body: []
  }).as('getClients')
  
  cy.intercept('GET', '**/rest/v1/products*', {
    statusCode: 200,
    body: []
  }).as('getProducts')
  
  cy.visit('/clients')
  cy.wait('@getClients')
})
```

### After:
```javascript
beforeEach(() => {
  cy.login('admin')
  
  cy.setupCommonIntercepts()
  
  cy.visit('/clients')
  cy.wait('@getClients')
})
```

## Special Cases

### Dynamic Responses (payments.cy.js)
Some tests require dynamic responses that change based on test state. These should keep their custom helper functions:

```javascript
const setupInvoiceIntercepts = (invoiceOverrides = {}) => {
  // Custom logic for dynamic responses
  cy.intercept('GET', '**/rest/v1/payments*', (req) => {
    req.reply({ statusCode: 200, body: payments })
  })
}
```

### Admin-Specific Tests
Admin tests often need special endpoints (profiles, subscriptions, HEAD requests). Set up only the common ones and add admin-specific intercepts separately.

## Additional Resources

- [Cypress Intercept Documentation](https://docs.cypress.io/api/commands/intercept)
- [Cypress Custom Commands](https://docs.cypress.io/api/cypress-api/custom-commands)
