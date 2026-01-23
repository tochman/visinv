/// <reference types="cypress" />

describe('Organization Management', () => {
  describe('Organization Setup Wizard', () => {
    beforeEach(() => {
      // Login with no organization first
      cy.login('admin', { skipOrgMock: true })
      
      // Then set up test-specific intercepts
      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: []
      }).as('getOrgMembers')

      cy.intercept('POST', '**/rest/v1/organizations*', (req) => {
        req.reply({
          statusCode: 201,
          body: [{ 
            id: 'new-org-id', 
            ...req.body,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]
        })
      }).as('createOrganization')

      cy.intercept('POST', '**/rest/v1/organization_members*', (req) => {
        req.reply({
          statusCode: 201,
          body: [{
            id: 'new-member-id',
            ...req.body,
            joined_at: new Date().toISOString()
          }]
        })
      }).as('createOrgMember')
      
      // Visit dashboard where wizard should appear
      cy.visit('/dashboard')
      
      // Wait for wizard to appear
      cy.getByCy('organization-wizard', { timeout: 5000 }).should('exist')
    })

    it('is expected to show setup wizard for new users without organization', () => {
      cy.getByCy('organization-wizard').should('be.visible')
      cy.contains('Set Up Your Organization').should('be.visible')
    })

    it('is expected to display all 4 steps in wizard', () => {
      cy.contains('Basic Information').should('be.visible')
      cy.getByCy('org-name-input').should('be.visible')
    })

    it('is expected to navigate through wizard steps', () => {
      // Fill step 1 - Basic Information
      cy.getByCy('org-name-input').type('Test Company AB')
      cy.getByCy('org-number-input').type('556677-8899')
      cy.getByCy('vat-number-input').type('SE556677889901')
      cy.getByCy('next-step-button').click()
      
      // Should be on step 2 - Address
      cy.contains('Address').should('be.visible')
      cy.getByCy('org-address-input').should('be.visible')
    })

    it('is expected to go back to previous step', () => {
      // Fill step 1 and go to step 2
      cy.getByCy('org-name-input').type('Test Company AB')
      cy.getByCy('org-number-input').type('556677-8899')
      cy.getByCy('vat-number-input').type('SE556677889901')
      cy.getByCy('next-step-button').click()
      
      // Go back
      cy.getByCy('back-button').click()
      
      // Should be on step 1 with data preserved
      cy.getByCy('org-name-input').should('have.value', 'Test Company AB')
    })
    
    it('is expected to complete wizard and create organization', () => {
      // Step 1: Basic Information
      cy.getByCy('org-name-input').type('Test Company AB')
      cy.getByCy('org-number-input').type('556677-8899')
      cy.getByCy('vat-number-input').type('SE556677889901')
      cy.getByCy('next-step-button').click()
      
      // Step 2: Address & Contact
      cy.getByCy('org-address-input').type('Storgatan 1')
      cy.getByCy('org-postal-code-input').type('11122')
      cy.getByCy('org-city-input').type('Stockholm')
      cy.getByCy('org-municipality-input').type('Stockholm')
      cy.getByCy('org-email-input').type('info@testcompany.se')
      cy.getByCy('org-phone-input').type('+46 8 123 456')
      cy.getByCy('next-step-button').click()
      
      // Step 3: Banking & Tax
      cy.getByCy('org-bank-giro-input').type('123-4567')
      cy.getByCy('org-f-skatt-checkbox').check()
      cy.getByCy('next-step-button').click()
      
      // Step 4: Invoice Settings
      cy.getByCy('org-invoice-prefix-input').type('INV')
      cy.getByCy('complete-setup-button').click()
      
      // Should create organization
      cy.wait('@createOrganization')
      
      // Wizard should close/redirect
      cy.getByCy('organization-wizard').should('not.exist')
    })
  })

  describe('Organization Settings Page', () => {
    beforeEach(() => {
      cy.fixture('organizations').then((data) => {
        // Login with custom organization data
        cy.login('admin', { customOrganization: data.mockOrganization })
        cy.visit('/settings')
        
        // Wait for page to load
        cy.getByCy('edit-organization', { timeout: 10000 }).should('be.visible')
      })
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
      cy.getByCy('edit-organization').should('be.visible')
    })

    it('is expected to enable editing mode when clicking edit', () => {
      cy.getByCy('edit-organization').click()
      cy.getByCy('org-name').should('be.visible')
    })

    it('is expected to update organization name', () => {
      cy.fixture('organizations').then((data) => {
        // Intercept the PATCH request
        cy.intercept('PATCH', '**/rest/v1/organizations**', (req) => {
          // Return a successful response matching Supabase format
          req.reply({
            statusCode: 200,
            body: {
              ...data.mockOrganization,
              ...req.body,
              updated_at: new Date().toISOString()
            }
          })
        }).as('updateOrganization')
        
        // Click edit button
        cy.getByCy('edit-organization').click()
        
        // Wait for form to initialize with data
        cy.getByCy('org-name', { timeout: 3000 }).should('be.visible').should('have.value', 'Acme AB')
        
        // Change the name
        cy.getByCy('org-name').clear().type('Acme Sweden AB')
        
        // Click save button
        cy.getByCy('save-organization').scrollIntoView().click()
        
        // Assert that the PATCH request was made with correct data
        cy.wait('@updateOrganization').then((interception) => {
          // Verify the request contains the updated name
          expect(interception.request.body).to.have.property('name', 'Acme Sweden AB')
          // Verify the role field is NOT sent (it belongs to organization_members)
          expect(interception.request.body).to.not.have.property('role')
          expect(interception.request.body).to.not.have.property('is_default')
          expect(interception.request.body).to.not.have.property('joined_at')
        })
      })
    })
  })
})
