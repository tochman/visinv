/// <reference types="cypress" />

// Custom commands for authentication and common operations

Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.get('button[type="submit"]').click()
  cy.url().should('not.include', '/login')
})

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click()
  cy.get('[data-testid="logout-button"]').click()
  cy.url().should('include', '/login')
})

// Mock authentication for testing without actual Supabase
Cypress.Commands.add('mockAuth', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User'
    }
  }
  
  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    user: mockUser
  }
  
  window.localStorage.setItem(
    'sb-test-auth-token',
    JSON.stringify(mockSession)
  )
})

// Clear all app data
Cypress.Commands.add('clearAppData', () => {
  cy.window().then((win) => {
    win.localStorage.clear()
    win.sessionStorage.clear()
  })
})

// Get element by data-testid
Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`)
})

// Fill client form
Cypress.Commands.add('fillClientForm', (clientData) => {
  if (clientData.name) {
    cy.get('input[name="name"]').clear().type(clientData.name)
  }
  if (clientData.email) {
    cy.get('input[name="email"]').clear().type(clientData.email)
  }
  if (clientData.phone) {
    cy.get('input[name="phone"]').clear().type(clientData.phone)
  }
  if (clientData.address) {
    cy.get('input[name="address"]').clear().type(clientData.address)
  }
  if (clientData.city) {
    cy.get('input[name="city"]').clear().type(clientData.city)
  }
  if (clientData.postalCode) {
    cy.get('input[name="postal_code"]').clear().type(clientData.postalCode)
  }
  if (clientData.country) {
    cy.get('input[name="country"]').clear().type(clientData.country)
  }
  if (clientData.orgNumber) {
    cy.get('input[name="org_number"]').clear().type(clientData.orgNumber)
  }
  if (clientData.vatNumber) {
    cy.get('input[name="vat_number"]').clear().type(clientData.vatNumber)
  }
  if (clientData.contactPerson) {
    cy.get('input[name="contact_person"]').clear().type(clientData.contactPerson)
  }
  if (clientData.notes) {
    cy.get('textarea[name="notes"]').clear().type(clientData.notes)
  }
})
