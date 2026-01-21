/// <reference types="cypress" />

const users = {
  admin: {
    id: 'test-admin-user-id',
    email: 'admin@test.com',
    user_metadata: { full_name: 'Admin User' },
    profile: { id: 'test-admin-user-id', email: 'admin@test.com', is_admin: true, plan_type: 'premium', full_name: 'Admin User' }
  },
  user: {
    id: 'test-regular-user-id',
    email: 'user@test.com',
    user_metadata: { full_name: 'Regular User' },
    profile: { id: 'test-regular-user-id', email: 'user@test.com', is_admin: false, plan_type: 'free', full_name: 'Regular User' }
  },
  premium_user: {
    id: 'test-premium-user-id',
    email: 'premium@test.com',
    user_metadata: { full_name: 'Premium User' },
    profile: { id: 'test-premium-user-id', email: 'premium@test.com', is_admin: false, plan_type: 'premium', full_name: 'Premium User' }
  },
  visitor: null
}

Cypress.Commands.add('login', (userType = 'user', options = {}) => {
  const userData = users[userType]
  if (userData === undefined) {
    throw new Error(`Unknown user type: ${userType}. Use: admin, user, premium_user, or visitor`)
  }

  if (!userData) {
    cy.visit('/')
    return
  }

  const mockSession = {
    access_token: 'test-access-token-' + userData.id,
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: {
      id: userData.id,
      email: userData.email,
      user_metadata: userData.user_metadata,
      aud: 'authenticated',
      role: 'authenticated'
    }
  }

  cy.intercept('GET', '**/auth/v1/user', {
    statusCode: 200,
    body: mockSession.user
  }).as('getUser')

  cy.intercept('GET', '**/auth/v1/token?*', {
    statusCode: 200,
    body: mockSession
  }).as('getToken')

  cy.intercept('POST', '**/auth/v1/token*', {
    statusCode: 200,
    body: mockSession
  }).as('refreshToken')

  cy.intercept('GET', '**/rest/v1/profiles*', {
    statusCode: 200,
    body: [userData.profile]
  }).as('getProfile')

  // Mock organization data - can be overridden by passing customOrganization in options
  if (!options.skipOrgMock) {
    const defaultOrganization = {
      id: 'test-org-id',
      name: 'Test Organization',
      organization_number: '',
      vat_number: '',
      municipality: '',
      address: '',
      city: '',
      postal_code: '',
      email: '',
      created_by: userData.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const organizationToUse = options.customOrganization || defaultOrganization

    cy.intercept('GET', '**/rest/v1/organization_members*', {
      statusCode: 200,
      body: [{
        id: 'test-org-member-id',
        user_id: userData.id,
        organization_id: organizationToUse.id,
        role: 'owner',
        is_default: true,
        joined_at: new Date().toISOString(),
        organizations: organizationToUse
      }]
    }).as('getOrganizations')
  }

  cy.visit('/', {
    onBeforeLoad(win) {
      const storageKey = `sb-${Cypress.env('SUPABASE_PROJECT_REF') || 'test'}-auth-token`
      win.localStorage.setItem(storageKey, JSON.stringify(mockSession))
      win.localStorage.setItem('language', 'en')
    }
  })

  // Wait for the app to load - no Redux store needed
  cy.get('[data-cy="main-layout"], [data-cy="dashboard"], nav', { timeout: 10000 }).should('exist')
})

Cypress.Commands.add('logout', () => {
  cy.clearLocalStorage()
  cy.clearCookies()
})

Cypress.Commands.add('getStore', () => {
  return cy.window().its('store')
})

Cypress.Commands.add('dispatch', (action) => {
  return cy.window().its('store').invoke('dispatch', action)
})

Cypress.Commands.add('getState', () => {
  return cy.window().its('store').invoke('getState')
})

Cypress.Commands.add('getByCy', (selector) => {
  return cy.get(`[data-cy="${selector}"]`)
})

Cypress.Commands.add('fillClientForm', (clientData) => {
  if (clientData.name) cy.getByCy('client-name-input').clear().type(clientData.name)
  if (clientData.email) cy.getByCy('client-email-input').clear().type(clientData.email)
  if (clientData.phone) cy.getByCy('client-phone-input').clear().type(clientData.phone)
  if (clientData.address) cy.get('input[name="address"]').clear().type(clientData.address)
  if (clientData.city) cy.get('input[name="city"]').clear().type(clientData.city)
  if (clientData.postalCode) cy.get('input[name="postal_code"]').clear().type(clientData.postalCode)
  if (clientData.country) cy.get('input[name="country"]').clear().type(clientData.country)
  if (clientData.orgNumber) cy.get('input[name="organization_number"]').clear().type(clientData.orgNumber)
  if (clientData.vatNumber) cy.get('input[name="vat_number"]').clear().type(clientData.vatNumber)
  if (clientData.contactPerson) cy.get('input[name="contact_person"]').clear().type(clientData.contactPerson)
  if (clientData.notes) cy.get('textarea[name="notes"]').clear().type(clientData.notes)
})