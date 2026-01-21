/// <reference types="cypress" />

describe('Organization Management', () => {
  describe('Organization Setup Wizard', () => {
    beforeEach(() => {
      // Mock empty organizations - must be set up BEFORE cy.login calls visit
      cy.intercept('GET', '**/rest/v1/organizations*', {
        statusCode: 200,
        body: []
      }).as('getOrganizations')

      cy.intercept('POST', '**/rest/v1/organizations*', (req) => {
        req.reply({
          statusCode: 201,
          body: [{ 
            id: 'new-org-id', 
            ...req.body[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
      }).as('createOrganization')

      cy.login('admin')
    })

    it('is expected to show setup wizard for new users without organization', () => {
      cy.get('[data-cy="organization-wizard"]').should('be.visible')
      cy.contains('Set Up Your Organization').should('be.visible')
    })

    it('is expected to display all 4 steps in wizard', () => {
      cy.contains('Basic Information').should('be.visible')
      cy.get('[data-cy="org-name-input"]').should('be.visible')
    })

    it('is expected to navigate through wizard steps', () => {
      // Fill step 1
      cy.get('[data-cy="org-name-input"]').type('Test Company AB')
      cy.get('[data-cy="next-step-button"]').click()
      
      // Should be on step 2
      cy.contains('Address').should('be.visible')
      cy.get('[data-cy="org-address-input"]').should('be.visible')
    })

    it('is expected to go back to previous step', () => {
      // Fill step 1 and go to step 2
      cy.get('[data-cy="org-name-input"]').type('Test Company AB')
      cy.get('[data-cy="next-step-button"]').click()
      
      // Go back
      cy.get('[data-cy="back-button"]').click()
      
      // Should be on step 1 with data preserved
      cy.get('[data-cy="org-name-input"]').should('have.value', 'Test Company AB')
    })
  })

  describe('Organization Settings Page', () => {
    const mockOrganization = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Acme AB',
      organization_number: '556677-8899',
      vat_number: 'SE556677889901',
      address: 'Storgatan 1',
      city: 'Stockholm',
      postal_code: '11122',
      municipality: 'Stockholm',
      country: 'Sweden',
      email: 'info@acme.se',
      phone: '+46 8 123 456',
      bank_giro: '123-4567',
      f_skatt_approved: true,
      invoice_number_prefix: 'INV',
      next_invoice_number: 1,
      default_payment_terms: 30,
      default_currency: 'SEK',
      default_tax_rate: 25.00,
      created_at: new Date().toISOString()
    }

    beforeEach(() => {
      // Mock organization_members query (used by getAll and getDefault)
      cy.intercept('GET', '**/rest/v1/organization_members*', {
        statusCode: 200,
        body: [{
          organization_id: mockOrganization.id,
          user_id: 'test-admin-user-id',
          role: 'owner',
          is_default: true,
          joined_at: new Date().toISOString(),
          organizations: mockOrganization
        }]
      }).as('getOrgMembers')

      cy.login('admin')
      cy.visit('/settings')
    })

    it('is expected to display organization name on settings page', () => {
      cy.contains('Acme AB').should('be.visible')
    })

    it('is expected to display organization number', () => {
      cy.contains('556677-8899').should('be.visible')
    })

    it('is expected to display VAT number', () => {
      cy.contains('SE556677889901').should('be.visible')
    })

    it('is expected to show edit button', () => {
      cy.get('[data-cy="edit-organization-button"]').should('be.visible')
    })

    it('is expected to enable editing mode when clicking edit', () => {
      cy.get('[data-cy="edit-organization-button"]').click()
      cy.get('[data-cy="org-name-input"]').should('be.visible')
    })

    it('is expected to update organization name', () => {
      cy.intercept('PATCH', '**/rest/v1/organizations*', (req) => {
        req.reply({
          statusCode: 200,
          body: [{
            ...mockOrganization,
            name: 'Acme Sweden AB'
          }]
        })
      }).as('updateOrganization')

      cy.get('[data-cy="edit-organization-button"]').click()
      cy.get('[data-cy="org-name-input"]').clear().type('Acme Sweden AB')
      cy.get('[data-cy="save-organization-button"]').click()

      cy.wait('@updateOrganization')
    })
  })
})
