# Cypress Test Improvements - Implementation Plan

## Quick Reference

**Status:** 🟡 Active Review  
**Priority Issues:** 3 High, 4 Medium, 2 Low  
**Estimated Effort:** 2-3 weeks for full implementation  
**Expected Impact:** 40-70% performance improvement, enhanced coverage

---

## Priority 1: Immediate Fixes (1-2 Days) 🚨

### 1.1 Remove Real Credentials ⚠️ SECURITY RISK
**Files to fix:**
- `cypress/e2e/credit-invoices.cy.js`
- `cypress/e2e/manual-invoice-numbering.cy.js`

**Current Issue:**
```javascript
const testUser = {
  email: 'thomas@communitaslabs.io',  // ❌ Real email exposed
  password: 'test123'
}
```

**Fix:**
```javascript
// Use the existing mock login system
beforeEach(() => {
  cy.login('user')  // Use mocked authentication
  cy.visit('/dashboard')
})
```

**Why:** Prevents credential exposure and follows the pattern used in other test files.

---

### 1.2 Replace Arbitrary Waits ⚡ PERFORMANCE
**Impact:** ~40-60% faster test execution

**Files to fix:** All test files with `cy.wait(milliseconds)`

**Pattern to find:**
```javascript
cy.wait(1000)
cy.wait(2000)
cy.wait(500)
```

**Replacements:**
```javascript
// ❌ Bad - Fixed delay
cy.get('[data-cy="save-invoice-button"]').click()
cy.wait(2000)
cy.contains('Standard Service').should('exist')

// ✅ Good - Wait for condition
cy.get('[data-cy="save-invoice-button"]').click()
cy.contains('Standard Service', { timeout: 5000 }).should('be.visible')

// ✅ Better - Wait for API
cy.get('[data-cy="save-invoice-button"]').click()
cy.wait('@createInvoice')
cy.get('[data-cy="success-message"]').should('be.visible')
```

**Occurrences:**
- `credit-invoices.cy.js`: 7 instances
- `manual-invoice-numbering.cy.js`: 9 instances
- `organizations.cy.js`: 3 instances
- `member-invitations.cy.js`: 2 instances

---

### 1.3 Fix Skipped Tests 🔧
**File:** `cypress/e2e/invoice-templates.cy.js`

**Issue:** 8 tests marked with `.skip` - reducing actual test coverage

**Options:**
1. **Fix and re-enable** if the feature is implemented
2. **Remove** if the feature changed and tests are no longer valid
3. **Update** tests to match current implementation

**Recommended approach:** Review the template editor implementation and update tests accordingly.

---

## Priority 2: Test Coverage Enhancements (3-5 Days) 📈

### 2.1 Add End-to-End Workflow Tests
**New file:** `cypress/e2e/invoice-workflow-e2e.cy.js`

```javascript
describe('E2E: Complete Invoice Workflow', () => {
  it('should complete full invoice lifecycle from creation to payment', () => {
    // 1. Login
    cy.login('user')
    
    // 2. Create client
    cy.visit('/clients')
    cy.get('[data-cy="create-client-button"]').click()
    cy.fillClientForm({ name: 'E2E Test Client' })
    cy.get('[data-cy="save-client-button"]').click()
    cy.wait('@createClient')
    
    // 3. Create invoice
    cy.visit('/invoices')
    cy.get('[data-cy="create-invoice-button"]').click()
    // ... fill invoice form
    cy.wait('@createInvoice')
    
    // 4. Preview invoice
    cy.get('[data-cy="preview-invoice"]').click()
    cy.get('[data-cy="invoice-preview"]').should('be.visible')
    
    // 5. Send invoice (if implemented)
    cy.get('[data-cy="send-invoice"]').click()
    cy.get('[data-cy="invoice-status"]').should('contain', 'Sent')
    
    // 6. Mark as paid
    cy.get('[data-cy="mark-paid"]').click()
    cy.get('[data-cy="invoice-status"]').should('contain', 'Paid')
  })
  
  it('should create and link credit invoice to original', () => {
    // Complete credit invoice workflow
  })
})
```

---

### 2.2 Add Network Resilience Tests
**New file:** `cypress/e2e/network-resilience.cy.js`

```javascript
describe('Network Failure Handling', () => {
  it('should show error message on network failure', () => {
    cy.login('user')
    cy.visit('/clients')
    
    // Simulate network failure
    cy.intercept('POST', '**/rest/v1/clients*', {
      forceNetworkError: true
    }).as('networkError')
    
    cy.get('[data-cy="create-client-button"]').click()
    cy.fillClientForm({ name: 'Test Client' })
    cy.get('[data-cy="save-client-button"]').click()
    
    cy.get('[data-cy="error-message"]').should('be.visible')
    cy.get('[data-cy="error-message"]').should('contain', 'network')
  })
  
  it('should retry failed request', () => {
    // Test automatic retry logic
  })
  
  it('should preserve form data after error', () => {
    // Verify form data isn't lost on error
  })
})
```

---

### 2.3 Add Accessibility Tests
**New file:** `cypress/e2e/accessibility.cy.js`

**Setup:**
```bash
npm install --save-dev cypress-axe axe-core
```

**Implementation:**
```javascript
import 'cypress-axe'

describe('Accessibility', () => {
  beforeEach(() => {
    cy.login('user')
  })
  
  it('should have no accessibility violations on clients page', () => {
    cy.visit('/clients')
    cy.injectAxe()
    cy.checkA11y()
  })
  
  it('should have no violations on invoice modal', () => {
    cy.visit('/invoices')
    cy.get('[data-cy="create-invoice-button"]').click()
    cy.injectAxe()
    cy.checkA11y('[data-cy="invoice-modal"]')
  })
  
  it('should be keyboard navigable', () => {
    cy.visit('/clients')
    cy.get('body').tab()
    cy.focused().should('have.attr', 'data-cy', 'create-client-button')
  })
})
```

---

## Priority 3: Performance Optimization (2-3 Days) ⚡

### 3.1 Enable Parallel Test Execution

**Update:** `cypress.config.js`
```javascript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    
    // Performance optimizations
    numTestsKeptInMemory: 0,
    experimentalMemoryManagement: true,
    
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
```

**Create:** `.github/workflows/cypress.yml`
```yaml
name: Cypress E2E Tests

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  cypress-run:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        containers: [1, 2, 3, 4]  # 4 parallel jobs
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start dev server
        run: npm run dev &
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Wait for server
        run: npx wait-on http://localhost:5173 --timeout 60000

      - name: Run Cypress tests
        uses: cypress-io/github-action@v6
        with:
          install: false
          record: true
          parallel: true
          group: 'E2E Tests'
        env:
          CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        if: always()
        with:
          files: ./coverage/lcov.info
```

---

### 3.2 Optimize Test Data Management

**Create:** `cypress/support/factories.js`
```javascript
// Test data factories for consistent, reusable data
export const ClientFactory = {
  build: (overrides = {}) => ({
    name: `Test Client ${Cypress._.random(1000, 9999)}`,
    email: `client${Cypress._.random(1000, 9999)}@test.com`,
    phone: '+46 70 123 4567',
    address: 'Test Street 1',
    city: 'Stockholm',
    postal_code: '111 22',
    country: 'Sweden',
    ...overrides
  })
}

export const InvoiceFactory = {
  build: (overrides = {}) => ({
    client_id: 'test-client-id',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    tax_rate: 25,
    ...overrides
  })
}

export const ProductFactory = {
  build: (overrides = {}) => ({
    name: `Product ${Cypress._.random(1000, 9999)}`,
    unit_price: 1000,
    unit: 'h',
    tax_rate: 25,
    ...overrides
  })
}
```

**Usage:**
```javascript
import { ClientFactory } from '../support/factories'

it('should create client', () => {
  const client = ClientFactory.build({ name: 'Special Client' })
  cy.fillClientForm(client)
  cy.get('[data-cy="save-client-button"]').click()
})
```

---

### 3.3 Add Smart Retry Configuration

**Update:** `cypress.config.js`
```javascript
export default defineConfig({
  e2e: {
    // ... existing config
    
    retries: {
      runMode: 2,      // Retry failed tests twice in CI
      openMode: 0      // Don't retry in development
    },
  },
})
```

---

## Priority 4: Advanced Features (1 Week) 🎯

### 4.1 Mobile Responsive Tests
**New file:** `cypress/e2e/mobile-responsive.cy.js`

```javascript
describe('Mobile Responsive Design', () => {
  const viewports = [
    { name: 'iPhone X', width: 375, height: 812 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Samsung Galaxy', width: 360, height: 740 }
  ]
  
  viewports.forEach(viewport => {
    describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      beforeEach(() => {
        cy.viewport(viewport.width, viewport.height)
        cy.login('user')
      })
      
      it('should display mobile menu', () => {
        cy.visit('/')
        cy.get('[data-cy="mobile-menu-button"]').should('be.visible')
      })
      
      it('should collapse tables appropriately', () => {
        cy.visit('/clients')
        cy.get('[data-cy="clients-table"]').should('be.visible')
        // Verify mobile-friendly display
      })
    })
  })
})
```

---

### 4.2 Performance Testing
**New file:** `cypress/e2e/performance.cy.js`

```javascript
describe('Performance with Large Datasets', () => {
  it('should handle 1000+ clients with pagination', () => {
    // Generate large dataset
    const largeClientList = Array.from({ length: 1000 }, (_, i) => ({
      id: `client-${i}`,
      name: `Client ${i}`,
      email: `client${i}@test.com`
    }))
    
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: largeClientList.slice(0, 50)  // First page
    }).as('getClients')
    
    cy.login('user')
    cy.visit('/clients')
    cy.wait('@getClients')
    
    // Verify page loads quickly
    cy.get('[data-cy="clients-table"]', { timeout: 3000 })
      .should('be.visible')
    
    // Verify pagination works
    cy.get('[data-cy="pagination"]').should('be.visible')
  })
  
  it('should search through large dataset quickly', () => {
    // Test search performance
    const start = Date.now()
    cy.get('[data-cy="search-clients-input"]').type('Client 999')
    cy.get('[data-cy="client-row"]').should('have.length', 1)
    const duration = Date.now() - start
    expect(duration).to.be.lessThan(1000)  // Should complete within 1 second
  })
})
```

---

### 4.3 Visual Regression Testing
**New file:** `cypress/e2e/visual-regression.cy.js`

**Setup:**
```bash
npm install --save-dev cypress-image-snapshot
```

**Implementation:**
```javascript
import 'cypress-image-snapshot/command'

describe('Visual Regression', () => {
  beforeEach(() => {
    cy.login('user')
  })
  
  it('should match invoice preview screenshot', () => {
    cy.visit('/invoices')
    cy.get('[data-cy="preview-invoice-1"]').click()
    cy.get('[data-cy="invoice-preview"]').should('be.visible')
    cy.matchImageSnapshot('invoice-preview')
  })
  
  it('should match client form screenshot', () => {
    cy.visit('/clients')
    cy.get('[data-cy="create-client-button"]').click()
    cy.get('[data-cy="client-modal"]').should('be.visible')
    cy.matchImageSnapshot('client-form')
  })
})
```

---

## Implementation Checklist

### Week 1: Critical Fixes ✅
- [ ] Remove real credentials from test files
- [ ] Replace all `cy.wait(ms)` with conditional waits
- [ ] Fix or remove skipped template tests
- [ ] Test execution time improvement validation

### Week 2: Coverage Enhancement 📊
- [ ] Add E2E workflow tests
- [ ] Add network resilience tests
- [ ] Add accessibility tests (install cypress-axe)
- [ ] Increase test coverage to 60%+

### Week 3: Performance & Advanced Features ⚡
- [ ] Set up parallel execution in GitHub Actions
- [ ] Add mobile responsive tests
- [ ] Add performance tests
- [ ] Set up visual regression (optional)
- [ ] Update documentation

---

## Success Metrics

### Before Improvements
- Test execution time: ~15 minutes
- Code coverage: ~50%
- Skipped tests: 8
- Security issues: 2 (real credentials)
- Flaky tests: ~2%

### After Improvements (Target)
- Test execution time: ~4 minutes (parallel)
- Code coverage: ~70%
- Skipped tests: 0
- Security issues: 0
- Flaky tests: <1%

---

## Documentation Updates

### Files to Create/Update
1. **Create:** `TESTING.md` - Comprehensive testing guide
2. **Update:** `README.md` - Add testing section
3. **Update:** `CONTRIBUTING.md` - Add testing requirements for PRs
4. **Create:** `.github/workflows/cypress.yml` - CI/CD pipeline

### Sample README Update
```markdown
## Testing

### Running Tests

# Open Cypress Test Runner (interactive)
npm run cy:open

# Run all tests headlessly
npm run cy:run

# Run specific test file
npm run cy:run -- --spec "cypress/e2e/clients.cy.js"

# Run with code coverage
npm run test:coverage

# View coverage report
open coverage/index.html

### Writing Tests
- Use `data-cy` attributes for selectors
- Follow existing test patterns in `cypress/e2e/`
- Wait for API responses with `cy.wait('@alias')`
- Avoid arbitrary waits like `cy.wait(1000)`
- See `TESTING.md` for detailed guidelines

### Test Coverage
Current coverage: ![Coverage](https://img.shields.io/badge/coverage-70%25-green)
Minimum required: 60%
```

---

## FAQ

### Q: Why remove `cy.wait(milliseconds)`?
**A:** Arbitrary waits make tests slower and more fragile. Cypress has built-in retry logic that waits for conditions automatically.

### Q: Should I delete skipped tests or fix them?
**A:** First, check if the feature still exists. If yes, update the test to match current implementation. If no, delete the test.

### Q: How do I run tests in parallel locally?
**A:** Use `npm run cy:run -- --parallel --record --key YOUR_KEY` after setting up Cypress Dashboard.

### Q: What's the benefit of accessibility testing?
**A:** Ensures your app is usable by people with disabilities, improves SEO, and helps meet legal requirements (WCAG, ADA).

### Q: Should I test on multiple browsers?
**A:** Yes, especially if you support multiple browsers. Start with Chrome (default), then add Firefox and Edge in CI.

---

## Resources

### Official Documentation
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress Parallelization](https://docs.cypress.io/guides/guides/parallelization)
- [Code Coverage](https://docs.cypress.io/guides/tooling/code-coverage)

### Plugins
- [cypress-axe](https://github.com/component-driven/cypress-axe) - Accessibility testing
- [cypress-file-upload](https://github.com/abramenal/cypress-file-upload) - File uploads
- [cypress-real-events](https://github.com/dmtrKovalenko/cypress-real-events) - Real user events

### Articles
- [Cypress Anti-Patterns](https://docs.cypress.io/guides/references/best-practices#Organizing-Tests-Logging-In-Controlling-State)
- [Testing Strategy Guide](https://martinfowler.com/articles/practical-test-pyramid.html)

---

**Last Updated:** 2026-01-23  
**Next Review:** After Week 1 implementation  
**Owner:** Development Team
