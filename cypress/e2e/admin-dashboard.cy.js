/// <reference types="cypress" />

describe('Admin Dashboard', () => {
  const _adminUser = {
    id: 'test-admin-user-id',
    email: 'admin@test.com',
    is_admin: true,
    plan_type: 'premium',
    full_name: 'Admin User'
  }

  const _regularUser = {
    id: 'test-regular-user-id',
    email: 'user@test.com',
    is_admin: false,
    plan_type: 'free',
    full_name: 'Regular User'
  }

  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization',
    organization_number: '123456-7890',
    created_at: new Date().toISOString()
  }

  beforeEach(() => {
    // Login first based on test context (done in each test)
    // Set up intercepts after login
    cy.intercept('GET', '**/rest/v1/organizations*', {
      statusCode: 200,
      body: [mockOrganization]
    }).as('getOrganizations')

    cy.intercept('GET', '**/rest/v1/organization_members*', {
      statusCode: 200,
      body: [{ organization_id: 'test-org-id', user_id: 'test-admin-user-id', role: 'owner' }]
    }).as('getOrgMembers')

    // Mock invoices to prevent dashboard errors
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: []
    }).as('getInvoices')
  })

  context('US-036: Admin Dashboard Access', () => {
    it('is expected to redirect regular users to dashboard', () => {
      // Mock regular user login
      cy.login('user')
      cy.visit('/admin')
      // Should be redirected to root dashboard
      cy.url().should('eq', Cypress.config().baseUrl + '/')
      cy.get('h1').should('not.contain', 'Admin')
    })

    it('is expected to allow access for admin users', () => {
      // Mock admin user login
      cy.login('admin')
      cy.getByCy('sidebar-nav-admin').click()
      
      // Wait for organization data to load
      cy.wait('@getOrganizations')

      // Check URL and Page content
      cy.url().should('include', '/admin')
      cy.getByCy('admin-dashboard-page').should('be.visible')
      cy.get('h1').should('contain', 'Admin')
    })
  })

  context('US-038: Platform Analytics', () => {
    beforeEach(() => {
      cy.login('admin')
      
      // Mock stats data - these are HEAD requests with count
      cy.intercept('HEAD', '**/rest/v1/profiles?select=id', { 
        statusCode: 200, 
        headers: { 'content-range': '0-149/150' },
        body: null
      }).as('getUserCount')

      cy.intercept('HEAD', '**/rest/v1/organizations?select=id', { 
        statusCode: 200, 
        headers: { 'content-range': '0-49/50' },
        body: null
      }).as('getOrgCount')

      cy.intercept('HEAD', '**/rest/v1/invoices?select=id', { 
        statusCode: 200, 
        headers: { 'content-range': '0-1249/1250' },
        body: null
      }).as('getInvoiceCount')

      cy.getByCy('sidebar-nav-admin').click()
      cy.wait('@getOrganizations')
      
      // Wait for stats to load
      cy.wait('@getUserCount')
      cy.wait('@getOrgCount')
      cy.wait('@getInvoiceCount')
    })

    it('is expected to display platform statistics', () => {
      cy.getByCy('stats-users').should('be.visible')
      cy.getByCy('stats-users-count').should('contain', '150')
      
      cy.getByCy('stats-orgs').should('be.visible')
      cy.getByCy('stats-orgs-count').should('contain', '50')

      cy.getByCy('stats-invoices').should('be.visible')
      cy.getByCy('stats-invoices-count').should('contain', '1250')
    })
  })
})
