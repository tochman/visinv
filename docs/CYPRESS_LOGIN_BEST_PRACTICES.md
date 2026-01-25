# Cypress cy.login() Best Practices

## Overview

The custom `cy.login()` command is a powerful helper that sets up authentication and loads the application. Understanding how to use it correctly is essential for writing clean, efficient Cypress tests.

## What cy.login() Does

The `cy.login()` command (defined in `cypress/support/commands.js`):

1. **Sets up authentication intercepts** - Mocks Supabase auth endpoints
2. **Loads the application** - Calls `cy.visit('/')` internally at line 154
3. **Handles cookie consent** - Automatically sets `visinv_cookie_consent` in localStorage (lines 160-166) to prevent the banner from blocking UI
4. **Mocks organization data** - Sets up organization members endpoint
5. **Dispatches to Redux store** - Sets organization and subscription data in Redux

## ✅ Correct Usage Patterns

### Pattern 1: Test the Home Page

If your test is about the home/dashboard page, just call `cy.login()` and start testing:

```javascript
beforeEach(() => {
  cy.login('admin')
  cy.wait('@getOrganizations')
})

it('is expected to display dashboard', () => {
  cy.getByCy('dashboard-title').should('be.visible')
})
```

### Pattern 2: Navigate to Another Page via Sidebar

If you need to test another page, use sidebar navigation with `cy.getByCy()`:

```javascript
beforeEach(() => {
  cy.login('admin')
  cy.setupCommonIntercepts()
  
  // Navigate to products page via sidebar
  cy.getByCy('sidebar-nav-products').click()
})

it('is expected to display products list', () => {
  cy.getByCy('products-table').should('be.visible')
})
```

**Examples from the codebase:**
- `clients.cy.js` - Navigates to clients via sidebar
- `products.cy.js` - Navigates to products via sidebar  
- `swedish-compliance.cy.js` - Navigates to settings via sidebar
- `organizations.cy.js` - Navigates to settings via sidebar

### Pattern 3: Direct URL Access (Special Cases Only)

For testing direct URL access (like invitation links), use the `setupAuth()` helper instead of `cy.login()`:

```javascript
beforeEach(() => {
  // Set up auth without visiting any page
  cy.setupAuth('user', { 
    customOrganization: mockOrganization,
    customEmail: 'invited@example.com'
  })

  // Visit the specific URL with auth already configured
  cy.get('@authSetup').then((authSetup) => {
    cy.visit(`/invite/${token}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem(authSetup.storageKey, authSetup.authData)
        win.localStorage.setItem('visinv_cookie_consent', authSetup.cookieConsent)
        win.localStorage.setItem('language', authSetup.language)
      }
    })
  })
})
```

**When to use this pattern:**
- Testing invitation acceptance pages (`/invite/{token}`)
- Testing direct links from emails
- Testing URL-based features that users wouldn't normally navigate to via the UI

**Example:** `member-invitations.cy.js` - Tests invitation acceptance flow

## ❌ Incorrect Usage Patterns

### Anti-Pattern 1: Using cy.visit() After cy.login()

**DON'T DO THIS:**
```javascript
beforeEach(() => {
  cy.login('admin')
  cy.visit('/settings')  // ❌ WRONG! cy.login() already loaded the app
})
```

**WHY IT'S WRONG:**
- `cy.login()` already calls `cy.visit('/')` internally
- This causes the app to load twice (inefficient)
- First load is wasted
- Cookie consent is already handled by cy.login()

**DO THIS INSTEAD:**
```javascript
beforeEach(() => {
  cy.login('admin')
  cy.getByCy('sidebar-nav-settings').click()  // ✅ Navigate via sidebar
})
```

### Anti-Pattern 2: Manually Handling Cookie Consent After cy.login()

**DON'T DO THIS:**
```javascript
beforeEach(() => {
  cy.login('admin')
  cy.getByCy('cookie-accept-btn').click()  // ❌ WRONG! Already handled
})
```

**WHY IT'S WRONG:**
- `cy.login()` already sets the cookie consent in localStorage
- The cookie banner won't appear after cy.login()
- This code will fail because the element doesn't exist

## Exception: Testing Access Control

There is ONE legitimate use case for `cy.visit()` after `cy.login()` - testing access control:

```javascript
it('is expected to redirect regular users away from admin page', () => {
  cy.login('user')
  
  // Try to visit admin page directly to test redirect behavior
  cy.visit('/admin')  // ✅ OK - Testing access control
  
  // Verify redirect happened
  cy.url().should('eq', Cypress.config().baseUrl + '/')
})
```

**When this exception applies:**
- Testing that unauthorized users are redirected from protected pages
- Testing URL-based access control
- The test specifically verifies redirect behavior

**Example:** `admin-dashboard.cy.js` line 61

## The setupAuth() Helper

For cases where you need authentication but want to visit a specific URL directly (not via navigation), use `setupAuth()`:

```javascript
cy.setupAuth(userType, options)
```

**Parameters:**
- `userType`: 'admin', 'user', 'premiumUser', etc.
- `options`:
  - `customOrganization`: Override organization data
  - `skipOrgMock`: Skip organization mock setup
  - `customEmail`: Override user email

**Returns:** An alias `@authSetup` containing:
- `storageKey`: The localStorage key for auth token
- `authData`: The auth session data
- `cookieConsent`: Cookie consent settings
- `language`: Language preference

**Usage:**
```javascript
cy.setupAuth('user', { customEmail: 'user@example.com' })
cy.get('@authSetup').then((authSetup) => {
  cy.visit('/specific-url', {
    onBeforeLoad(win) {
      win.localStorage.setItem(authSetup.storageKey, authSetup.authData)
      win.localStorage.setItem('visinv_cookie_consent', authSetup.cookieConsent)
      win.localStorage.setItem('language', authSetup.language)
    }
  })
})
```

## Summary

| Scenario | Correct Approach | Incorrect Approach |
|----------|-----------------|-------------------|
| Test home page | `cy.login('admin')` | N/A |
| Navigate to another page | `cy.login('admin')` then `cy.getByCy('sidebar-nav-X').click()` | `cy.login('admin')` then `cy.visit('/page')` |
| Test direct URL access | `cy.setupAuth('user')` then visit URL | `cy.login('user')` then `cy.visit('/url')` |
| Test access control redirect | `cy.login('user')` then `cy.visit('/protected')` | N/A |
| Handle cookie consent | Nothing (cy.login handles it) | Manually clicking accept button |

## Key Takeaways

1. ✅ `cy.login()` loads the application - don't call `cy.visit()` after it
2. ✅ `cy.login()` handles cookie consent - don't manually accept cookies
3. ✅ Use `cy.getByCy('sidebar-nav-X').click()` to navigate to other pages
4. ✅ Use `cy.setupAuth()` for direct URL access scenarios
5. ⚠️ Only use `cy.visit()` after `cy.login()` when testing access control redirects

## Related Files

- `cypress/support/commands.js` - Implementation of cy.login() and cy.setupAuth()
- `cypress/e2e/cookie-consent.cy.js` - Cookie consent tests
- `cypress/e2e/member-invitations.cy.js` - Example of setupAuth() usage
- `cypress/e2e/admin-dashboard.cy.js` - Example of access control testing exception
