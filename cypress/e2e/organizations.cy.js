/// <reference types="cypress" />

describe('Organization Management', () => {
  describe('Organization Setup Wizard', () => {
    // Track organization data to return - starts null, populated after creation
    let orgCreated = false
    let newOrgData = null

    beforeEach(() => {
      // Reset state for each test
      orgCreated = false
      
      newOrgData = {
        id: 'new-org-id', 
        name: 'Test Company AB',
        organization_number: '556677-8899',
        vat_number: 'SE556677889901',
        address: 'Storgatan 1',
        postal_code: '11122',
        city: 'Stockholm',
        municipality: 'Stockholm',
        email: 'info@testcompany.se',
        phone: '+46 8 123 456',
        bank_giro: '123-4567',
        f_skatt_approved: true,
        invoice_number_prefix: 'INV',
        next_invoice_number: 1,
        default_payment_terms: 30,
        default_currency: 'SEK',
        default_tax_rate: 25.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Single intercept that returns empty initially, then org data after creation
      cy.intercept('GET', '**/rest/v1/organization_members?*', (req) => {
        if (orgCreated) {
          req.reply({
            statusCode: 200,
            body: [{
              role: 'owner',
              is_default: true,
              joined_at: newOrgData.created_at,
              organizations: newOrgData
            }]
          })
        } else {
          req.reply({
            statusCode: 200,
            body: []
          })
        }
      }).as('getOrganizationMembers')

      cy.setupCommonIntercepts({
        invoices: null,
        clients: null,
        products: null,
        templates: null
      })

      // Login but expect wizard instead of main layout
      cy.login('admin', { skipOrgMock: true, expectWizard: true })
      
      // Wait for the organization members query to complete
      cy.wait('@getOrganizationMembers')

      // Intercept organization creation - returns single object because of .single()
      cy.intercept('POST', '**/rest/v1/organizations*', (req) => {
        orgCreated = true  // Mark that org was created
        req.reply({
          statusCode: 201,
          body: newOrgData
        })
      }).as('createOrganization')
      
      // Intercept setDefault
      cy.intercept('PATCH', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: {}
      }).as('setDefaultOrg')
    })

    it('is expected to show setup wizard for new users without organization', () => {
      cy.getByCy('organization-wizard').should('be.visible')
      cy.contains('Set Up Your Organization').should('be.visible')
    })

    it('is expected to display all 5 steps in wizard', () => {
      cy.getByCy('organization-wizard', { timeout: 10000 }).should('be.visible')
      cy.contains('Basic Information').should('be.visible')
      cy.getByCy('org-name-input').should('be.visible')
    })

    it('is expected to navigate through wizard steps', () => {
      cy.getByCy('organization-wizard', { timeout: 10000 }).should('be.visible')
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
      cy.getByCy('organization-wizard', { timeout: 10000 }).should('be.visible')
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

    it('is expected to show proficiency selector in step 5', () => {
      cy.getByCy('organization-wizard', { timeout: 10000 }).should('be.visible')
      
      // Navigate through steps 1-4
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
      cy.getByCy('next-step-button').click()
      
      // Step 5: Experience Level
      cy.getByCy('proficiency-selector').should('be.visible')
      cy.getByCy('proficiency-option-novice').scrollIntoView().should('be.visible')
      cy.getByCy('proficiency-option-basic').scrollIntoView().should('be.visible')
      cy.getByCy('proficiency-option-proficient').scrollIntoView().should('be.visible')
      cy.getByCy('proficiency-option-expert').scrollIntoView().should('be.visible')
    })

    it('is expected to allow selecting proficiency level', () => {
      cy.getByCy('organization-wizard', { timeout: 10000 }).should('be.visible')
      
      // Navigate through steps 1-4
      cy.getByCy('org-name-input').type('Test Company AB')
      cy.getByCy('org-number-input').type('556677-8899')
      cy.getByCy('vat-number-input').type('SE556677889901')
      cy.getByCy('next-step-button').click()
      
      cy.getByCy('org-address-input').type('Storgatan 1')
      cy.getByCy('org-postal-code-input').type('11122')
      cy.getByCy('org-city-input').type('Stockholm')
      cy.getByCy('org-municipality-input').type('Stockholm')
      cy.getByCy('org-email-input').type('info@testcompany.se')
      cy.getByCy('org-phone-input').type('+46 8 123 456')
      cy.getByCy('next-step-button').click()
      
      cy.getByCy('org-bank-giro-input').type('123-4567')
      cy.getByCy('org-f-skatt-checkbox').check()
      cy.getByCy('next-step-button').click()
      
      cy.getByCy('org-invoice-prefix-input').type('INV')
      cy.getByCy('next-step-button').click()
      
      // Step 5: Select expert level
      cy.getByCy('proficiency-option-expert').click()
      
      // Verify expert is selected (has ring class indicating selection)
      cy.getByCy('proficiency-option-expert').should('have.class', 'ring-2')
    })
    
    it('is expected to complete wizard and create organization', () => {
      cy.getByCy('organization-wizard', { timeout: 10000 }).should('be.visible')
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
      cy.getByCy('next-step-button').click()
      
      // Step 5: Experience Level (Proficiency)
      cy.getByCy('proficiency-selector').should('be.visible')
      cy.getByCy('proficiency-option-basic').click()
      
      // Mock the profile update for proficiency
      cy.intercept('PATCH', '**/rest/v1/profiles?*', {
        statusCode: 200,
        body: {}
      }).as('updateProfile')
      
      // Override the organization members intercept to return the new org after creation
      // This intercept takes precedence over the one set in beforeEach
      cy.intercept('GET', '**/rest/v1/organization_members?*', {
        statusCode: 200,
        body: [{
          role: 'owner',
          is_default: true,
          joined_at: new Date().toISOString(),
          organizations: {
            id: 'new-org-id', 
            name: 'Test Company AB',
            organization_number: '556677-8899',
            vat_number: 'SE556677889901',
            address: 'Storgatan 1',
            postal_code: '11122',
            city: 'Stockholm',
            municipality: 'Stockholm',
            email: 'info@testcompany.se',
            phone: '+46 8 123 456',
            bank_giro: '123-4567',
            f_skatt_approved: true,
            invoice_number_prefix: 'INV',
            next_invoice_number: 1,
            default_payment_terms: 30,
            default_currency: 'SEK',
            default_tax_rate: 25.00,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }]
      }).as('getOrganizationsAfterCreate')
      
      cy.getByCy('complete-setup-button').click()
      
      // Should create organization (member is added via database trigger)
      cy.wait('@createOrganization')
      
      // Should update profile with proficiency
      cy.wait('@updateProfile')
      
      // After creation, the context reloads organizations
      cy.wait('@getOrganizationsAfterCreate')
      
      // And sets it as default
      cy.wait('@setDefaultOrg')
      
      // Wizard should close/redirect
      cy.getByCy('organization-wizard').should('not.exist')
    })
  })

  describe('Organization Settings Page', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        invoices: [],
        clients: [],
        products: [],
        templates: []
      });
      
      cy.fixture('organizations').then((data) => {
        // Login with custom organization data
        cy.login('admin', { customOrganization: data.mockOrganization })
        cy.getByCy('sidebar-nav-settings').click()
        
        // Click on Organization Settings tab
        cy.getByCy('tab-settings').click()
        
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
