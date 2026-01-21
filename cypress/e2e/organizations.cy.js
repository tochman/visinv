describe('Organization Management', () => {
  beforeEach(() => {
    cy.visit('/auth/signin')
    cy.get('[data-cy="email-input"]').type('test@example.com')
    cy.get('[data-cy="password-input"]').type('password123')
    cy.get('[data-cy="signin-button"]').click()
    cy.url().should('include', '/')
  })

  describe('Organization Setup Wizard', () => {
    it('is expected to show setup wizard for new users without organization', () => {
      // Intercept organization check to return empty
      cy.intercept('GET', '**/organizations*', { data: [] }).as('getOrganizations')
      
      cy.visit('/')
      cy.wait('@getOrganizations')
      
      // Should show setup wizard
      cy.contains('Set Up Your Organization').should('be.visible')
    })

    it('is expected to create organization through 4-step wizard', () => {
      cy.intercept('POST', '**/organizations', {
        statusCode: 201,
        body: {
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Acme AB',
            organization_number: '556677-8899',
            vat_number: 'SE556677889901',
            created_at: new Date().toISOString()
          }
        }
      }).as('createOrganization')

      // Open wizard (assuming it's triggered somewhere)
      cy.get('[data-cy="setup-organization-button"]').click()

      // Step 1: Basic Information
      cy.get('[data-cy="org-name-input"]').type('Acme AB')
      cy.get('[data-cy="org-number-input"]').type('556677-8899')
      cy.get('[data-cy="vat-number-input"]').type('SE556677889901')
      cy.get('[data-cy="next-step-button"]').click()

      // Step 2: Address & Contact
      cy.get('[data-cy="org-address-input"]').type('Storgatan 1')
      cy.get('[data-cy="org-postal-code-input"]').type('11122')
      cy.get('[data-cy="org-city-input"]').type('Stockholm')
      cy.get('[data-cy="org-municipality-input"]').type('Stockholm')
      cy.get('[data-cy="org-email-input"]').type('info@acme.se')
      cy.get('[data-cy="org-phone-input"]').type('+46 8 123 456')
      cy.get('[data-cy="next-step-button"]').click()

      // Step 3: Banking & Tax
      cy.get('[data-cy="org-bank-giro-input"]').type('123-4567')
      cy.get('[data-cy="org-iban-input"]').type('SE45 5000 0000 0583 9825 7466')
      cy.get('[data-cy="org-f-skatt-checkbox"]').check()
      cy.get('[data-cy="next-step-button"]').click()

      // Step 4: Invoice Settings
      cy.get('[data-cy="org-invoice-prefix-input"]').should('have.value', 'INV')
      cy.get('[data-cy="org-next-invoice-number-input"]').should('have.value', '1')
      cy.get('[data-cy="org-payment-terms-input"]').clear().type('30')
      cy.get('[data-cy="org-currency-select"]').select('SEK')
      cy.get('[data-cy="org-tax-rate-input"]').should('have.value', '25')
      
      cy.get('[data-cy="complete-setup-button"]').click()
      cy.wait('@createOrganization')

      // Should close wizard and show dashboard
      cy.contains('Set Up Your Organization').should('not.exist')
    })

    it('is expected to validate required fields in step 1', () => {
      cy.get('[data-cy="setup-organization-button"]').click()
      
      // Try to proceed without company name
      cy.get('[data-cy="next-step-button"]').click()
      
      // Should show validation error
      cy.contains('required').should('be.visible')
    })
  })

  describe('Organization CRUD', () => {
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
      cy.intercept('GET', '**/organizations*', {
        data: [mockOrganization]
      }).as('getOrganizations')
    })

    it('is expected to display organization settings', () => {
      cy.visit('/settings')
      cy.wait('@getOrganizations')

      // Should show organization info
      cy.contains('Acme AB').should('be.visible')
      cy.contains('556677-8899').should('be.visible')
      cy.contains('SE556677889901').should('be.visible')
    })

    it('is expected to update organization details', () => {
      cy.intercept('PATCH', '**/organizations/*', {
        statusCode: 200,
        body: {
          data: {
            ...mockOrganization,
            name: 'Acme Sweden AB'
          }
        }
      }).as('updateOrganization')

      cy.visit('/settings')
      cy.wait('@getOrganizations')

      cy.get('[data-cy="edit-organization-button"]').click()
      cy.get('[data-cy="org-name-input"]').clear().type('Acme Sweden AB')
      cy.get('[data-cy="save-organization-button"]').click()

      cy.wait('@updateOrganization')
      cy.contains('Acme Sweden AB').should('be.visible')
    })

    it('is expected to update invoice settings', () => {
      cy.intercept('PATCH', '**/organizations/*', {
        statusCode: 200,
        body: {
          data: {
            ...mockOrganization,
            invoice_number_prefix: 'FAK',
            default_payment_terms: 15
          }
        }
      }).as('updateOrganization')

      cy.visit('/settings')
      cy.wait('@getOrganizations')

      cy.get('[data-cy="invoice-prefix-input"]').clear().type('FAK')
      cy.get('[data-cy="payment-terms-input"]').clear().type('15')
      cy.get('[data-cy="save-settings-button"]').click()

      cy.wait('@updateOrganization')
      cy.get('[data-cy="invoice-prefix-input"]').should('have.value', 'FAK')
    })
  })

  describe('Organization-Scoped Invoice Numbering', () => {
    const mockOrganization = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Acme AB',
      invoice_number_prefix: 'FAK',
      next_invoice_number: 5,
      default_payment_terms: 30,
      default_currency: 'SEK',
      default_tax_rate: 25.00
    }

    const mockClient = {
      id: 'client-123',
      name: 'Test Client AB',
      email: 'client@example.com'
    }

    beforeEach(() => {
      cy.intercept('GET', '**/organizations*', {
        data: [mockOrganization]
      }).as('getOrganizations')

      cy.intercept('GET', '**/clients*', {
        data: [mockClient]
      }).as('getClients')

      cy.intercept('GET', '**/products*', {
        data: []
      }).as('getProducts')
    })

    it('is expected to use organization invoice number prefix', () => {
      cy.intercept('POST', '**/invoices', (req) => {
        expect(req.body.invoice_number).to.match(/^FAK-\d{4}$/)
        expect(req.body.organization_id).to.equal(mockOrganization.id)
        
        req.reply({
          statusCode: 201,
          body: {
            data: {
              id: 'invoice-123',
              invoice_number: 'FAK-0005',
              organization_id: mockOrganization.id,
              ...req.body
            }
          }
        })
      }).as('createInvoice')

      cy.visit('/invoices')
      cy.wait('@getOrganizations')
      cy.wait('@getClients')

      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')
      cy.get('[data-cy="save-invoice-button"]').click()

      cy.wait('@createInvoice')
      cy.contains('FAK-0005').should('be.visible')
    })

    it('is expected to increment invoice number per organization', () => {
      let invoiceCount = 5

      cy.intercept('POST', '**/invoices', (req) => {
        const expectedNumber = `FAK-${String(invoiceCount).padStart(4, '0')}`
        
        req.reply({
          statusCode: 201,
          body: {
            data: {
              id: `invoice-${invoiceCount}`,
              invoice_number: expectedNumber,
              organization_id: mockOrganization.id,
              ...req.body
            }
          }
        })
        
        invoiceCount++
      }).as('createInvoice')

      cy.visit('/invoices')
      cy.wait('@getOrganizations')

      // Create first invoice
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getClients')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      cy.get('[data-cy="unit-price-input-0"]').type('1000')
      cy.get('[data-cy="save-invoice-button"]').click()
      cy.wait('@createInvoice')
      cy.contains('FAK-0005').should('be.visible')

      // Create second invoice
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      cy.get('[data-cy="unit-price-input-0"]').type('2000')
      cy.get('[data-cy="save-invoice-button"]').click()
      cy.wait('@createInvoice')
      cy.contains('FAK-0006').should('be.visible')
    })
  })

  describe('Multiple Organizations', () => {
    const mockOrgs = [
      {
        id: 'org-1',
        name: 'Acme AB',
        invoice_number_prefix: 'ACME',
        organization_members: [{ is_default: true }]
      },
      {
        id: 'org-2',
        name: 'Beta AB',
        invoice_number_prefix: 'BETA',
        organization_members: [{ is_default: false }]
      }
    ]

    beforeEach(() => {
      cy.intercept('GET', '**/organizations*', {
        data: mockOrgs
      }).as('getOrganizations')
    })

    it('is expected to switch between organizations', () => {
      cy.visit('/settings')
      cy.wait('@getOrganizations')

      // Should show default organization
      cy.contains('Acme AB').should('be.visible')

      // Switch to second organization
      cy.get('[data-cy="organization-switcher"]').click()
      cy.contains('Beta AB').click()

      // Should update context
      cy.contains('Beta AB').should('be.visible')
    })

    it('is expected to scope data by current organization', () => {
      cy.intercept('GET', '**/invoices*organization_id=org-1*', {
        data: [
          { id: 'inv-1', invoice_number: 'ACME-0001', organization_id: 'org-1' }
        ]
      }).as('getAcmeInvoices')

      cy.intercept('GET', '**/invoices*organization_id=org-2*', {
        data: [
          { id: 'inv-2', invoice_number: 'BETA-0001', organization_id: 'org-2' }
        ]
      }).as('getBetaInvoices')

      cy.visit('/invoices')
      cy.wait('@getOrganizations')
      
      // Should show Acme invoices (default org)
      cy.wait('@getAcmeInvoices')
      cy.contains('ACME-0001').should('be.visible')
      cy.contains('BETA-0001').should('not.exist')

      // Switch to Beta
      cy.get('[data-cy="organization-switcher"]').click()
      cy.contains('Beta AB').click()
      
      cy.wait('@getBetaInvoices')
      cy.contains('BETA-0001').should('be.visible')
      cy.contains('ACME-0001').should('not.exist')
    })
  })
})
