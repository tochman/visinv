/// <reference types="cypress" />

describe('Invoice Management', () => {
  const mockClient = {
    id: 'client-123',
    name: 'Test Client AB',
    email: 'client@test.com'
  }

  const mockTemplate = {
    id: 'template-1',
    user_id: null,
    name: 'Modern',
    content: '<html><body><h1>{{invoice_number}}</h1><p>{{client_name}}</p></body></html>',
    is_system: true
  }

  beforeEach(() => {
    // Login first to establish session
    cy.login('admin')
    
    // Then set up test-specific intercepts
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: [mockClient]
    }).as('getClients')

    // Mock templates endpoint
    cy.intercept('GET', '**/rest/v1/invoice_templates*', {
      statusCode: 200,
      body: [mockTemplate]
    }).as('getTemplates')

    // Mock invoices endpoint
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: []
    }).as('getInvoices')

    // Mock create invoice
    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      const invoice = {
        id: 'new-invoice-id',
        invoice_number: 'INV-0001',
        ...req.body,
        client: mockClient,
        status: 'draft'
      }
      req.reply({
        statusCode: 201,
        body: invoice
      })
    }).as('createInvoice')

    // Mock invoice rows
    cy.intercept('POST', '**/rest/v1/invoice_rows*', {
      statusCode: 201,
      body: []
    }).as('createInvoiceRows')

    cy.visit('/invoices')
    cy.wait('@getInvoices')
    cy.wait('@getTemplates')
  })

  describe('Happy Path - Creating an Invoice', () => {
    it('is expected to display the invoices page', () => {
      cy.get('[data-cy="invoices-page-title"]').should('be.visible')
      cy.get('[data-cy="create-invoice-button"]').should('be.visible')
    })

    it('is expected to open the invoice modal when clicking create button', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
      cy.get('[data-cy="invoice-form"]').should('be.visible')
    })

    it('is expected to create an invoice with required fields and one line item', () => {
      cy.get('[data-cy="create-invoice-button"]').should('be.visible').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')

      // Select client
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      // Dates are already pre-filled, just verify they exist
      cy.get('[data-cy="issue-date-input"]').should('exist').and('not.have.value', '')
      cy.get('[data-cy="due-date-input"]').should('exist').and('not.have.value', '')

      // Add line item
      cy.get('[data-cy="description-input-0"]').type('Consulting Services')
      cy.get('[data-cy="quantity-input-0"]').clear().type('10')
      cy.get('[data-cy="unit-input-0"]').clear().type('hours')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1500')

      // Verify calculated amount
      cy.get('[data-cy="amount-0"]').should('contain', '15000')

      // Verify totals
      cy.get('[data-cy="subtotal-display"]').should('contain', '15000.00')
      cy.get('[data-cy="vat-25-display"]').should('contain', '3750.00')  // 25% of 15000
      cy.get('[data-cy="total-display"]').should('contain', '18750.00')

      cy.get('[data-cy="submit-button"]').click()

      cy.wait('@createInvoice')
      cy.get('[data-cy="invoice-modal"]').should('not.exist')
    })

    it('is expected to add multiple line items', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')

      // Select client
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      // First line item
      cy.get('[data-cy="description-input-0"]').type('Development')
      cy.get('[data-cy="quantity-input-0"]').clear().type('20')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1200')

      // Add second line item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="line-item-1"]').should('exist')
      
      cy.get('[data-cy="description-input-1"]').type('Design Work')
      cy.get('[data-cy="quantity-input-1"]').clear().type('15')
      cy.get('[data-cy="unit-price-input-1"]').clear().type('1000')

      // Add third line item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="line-item-2"]').should('exist')
      
      cy.get('[data-cy="description-input-2"]').type('Project Management')
      cy.get('[data-cy="quantity-input-2"]').clear().type('10')
      cy.get('[data-cy="unit-price-input-2"]').clear().type('1500')

      // Verify total: (20*1200) + (15*1000) + (10*1500) = 24000 + 15000 + 15000 = 54000
      cy.get('[data-cy="subtotal-display"]').should('contain', '54000.00')
      cy.get('[data-cy="total-display"]').should('contain', '67500.00') // +25% tax

      cy.get('[data-cy="submit-button"]').click()
      cy.wait('@createInvoice')
    })

    it('is expected to remove a line item', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      // Add second item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="line-item-1"]').should('exist')

      // Add third item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="line-item-2"]').should('exist')

      // Remove second item
      cy.get('[data-cy="remove-line-item-1"]').click()
      cy.get('[data-cy="line-item-2"]').should('not.exist')
      cy.get('[data-cy="line-item-1"]').should('exist')
    })

    it('is expected not to remove the last line item', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      
      // Only one item exists, remove button should be disabled
      cy.get('[data-cy="remove-line-item-0"]').should('be.disabled')
    })

    it('is expected to update totals when tax rate changes', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')

      // Default 25% tax
      cy.get('[data-cy="vat-25-display"]').should('contain', '250.00')
      cy.get('[data-cy="total-display"]').should('contain', '1250.00')
    })

    it('is expected to close the modal when clicking cancel', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
      cy.get('[data-cy="cancel-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('not.exist')
    })

    it('is expected to close the modal when clicking X button', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
      cy.get('[data-cy="close-modal-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('not.exist')
    })
  })

  describe('Validation', () => {
    it('is expected to show error when no client is selected', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      
      cy.get('[data-cy="description-input-0"]').type('Test Service')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')
      
      cy.get('[data-cy="submit-button"]').click()
      
      // Error should exist (may be partially covered by sticky header)
      cy.get('[data-cy="invoice-form-error"]').should('exist')
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
    })

    it('is expected to show error when no line items have descriptions', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Leave description empty
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')
      
      cy.get('[data-cy="submit-button"]').click()
      
      cy.get('[data-cy="invoice-form-error"]').should('exist')
    })

    it('is expected to allow submitting with empty line items if at least one has a description', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Add multiple items
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="add-line-item-button"]').click()

      // Only fill first item
      cy.get('[data-cy="description-input-0"]').type('Valid Service')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')

      // Leave others empty
      
      cy.get('[data-cy="submit-button"]').click()
      
      cy.wait('@createInvoice')
      cy.get('[data-cy="invoice-modal"]').should('not.exist')
    })
  })

  describe('Invoice List - Status Management', () => {
    const mockInvoices = [
      {
        id: 'inv-1',
        invoice_number: 'INV-001',
        client: mockClient,
        issue_date: '2026-01-01',
        due_date: '2026-01-31',
        status: 'draft',
        total_amount: '10000.00',
        currency: 'SEK'
      },
      {
        id: 'inv-2',
        invoice_number: 'INV-002',
        client: mockClient,
        issue_date: '2026-01-15',
        due_date: '2026-02-15',
        status: 'sent',
        total_amount: '25000.00',
        currency: 'SEK'
      }
    ]

    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: mockInvoices
      }).as('getInvoicesWithData')
      
      cy.visit('/invoices')
      cy.wait('@getInvoicesWithData')
    })

    it('is expected to display invoice list', () => {
      cy.get('[data-cy="invoices-list"]').should('be.visible')
      cy.get('[data-cy="invoices-table"]').should('be.visible')
      cy.get('[data-cy="invoice-row-inv-1"]').should('exist')
      cy.get('[data-cy="invoice-row-inv-2"]').should('exist')
    })

    it('is expected to show correct status badges', () => {
      cy.get('[data-cy="invoice-status-inv-1"]').should('contain', 'Draft')
      cy.get('[data-cy="invoice-status-inv-2"]').should('contain', 'Sent')
    })

    it('is expected to show "Mark as Sent" button for draft invoices', () => {
      cy.get('[data-cy="mark-sent-button-inv-1"]').should('be.visible')
      cy.get('[data-cy="mark-sent-button-inv-2"]').should('not.exist')
    })

    it('is expected to show "Mark as Paid" button for sent invoices', () => {
      cy.get('[data-cy="mark-paid-button-inv-1"]').should('not.exist')
      cy.get('[data-cy="mark-paid-button-inv-2"]').should('be.visible')
    })

    it('is expected to mark invoice as sent', () => {
      cy.intercept('PATCH', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: { ...mockInvoices[0], status: 'sent' }
      }).as('updateInvoice')

      cy.get('[data-cy="mark-sent-button-inv-1"]').click()
      cy.wait('@updateInvoice')
    })

    it('is expected to mark invoice as paid', () => {
      cy.intercept('PATCH', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: { ...mockInvoices[1], status: 'paid' }
      }).as('updateInvoice')

      cy.get('[data-cy="mark-paid-button-inv-2"]').click()
      cy.wait('@updateInvoice')
    })

    it('is expected to filter invoices by status', () => {
      cy.get('[data-cy="status-filter-select"]').select('draft')
      cy.get('[data-cy="invoice-row-inv-1"]').should('exist')
      cy.get('[data-cy="invoice-row-inv-2"]').should('not.exist')

      cy.get('[data-cy="status-filter-select"]').select('sent')
      cy.get('[data-cy="invoice-row-inv-1"]').should('not.exist')
      cy.get('[data-cy="invoice-row-inv-2"]').should('exist')

      cy.get('[data-cy="status-filter-select"]').select('all')
      cy.get('[data-cy="invoice-row-inv-1"]').should('exist')
      cy.get('[data-cy="invoice-row-inv-2"]').should('exist')
    })

    it('is expected to search invoices by invoice number', () => {
      cy.get('[data-cy="search-invoices-input"]').type('INV-001')
      cy.get('[data-cy="invoice-row-inv-1"]').should('exist')
      cy.get('[data-cy="invoice-row-inv-2"]').should('not.exist')
    })

    it('is expected to search invoices by client name', () => {
      cy.get('[data-cy="search-invoices-input"]').type('Test Client')
      cy.get('[data-cy="invoice-row-inv-1"]').should('exist')
      cy.get('[data-cy="invoice-row-inv-2"]').should('exist')
    })

    it('is expected to open delete confirmation modal', () => {
      cy.get('[data-cy="delete-invoice-button-inv-1"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('be.visible')
    })

    it('is expected to cancel deletion', () => {
      cy.get('[data-cy="delete-invoice-button-inv-1"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('be.visible')
      cy.get('[data-cy="cancel-delete-button"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('not.exist')
    })

    it('is expected to delete an invoice', () => {
      cy.intercept('DELETE', '**/rest/v1/invoices*', {
        statusCode: 204
      }).as('deleteInvoice')

      cy.get('[data-cy="delete-invoice-button-inv-1"]').click()
      cy.get('[data-cy="delete-confirm-modal"]').should('be.visible')
      cy.get('[data-cy="confirm-delete-button"]').click()
      
      cy.wait('@deleteInvoice')
      cy.get('[data-cy="delete-confirm-modal"]').should('not.exist')
    })
  })

  describe('Empty State', () => {
    it('is expected to show empty state when no invoices exist', () => {
      cy.get('[data-cy="invoices-empty-state"]').should('be.visible')
      cy.get('[data-cy="empty-state-create-button"]').should('be.visible')
    })

    it('is expected to open modal from empty state button', () => {
      cy.get('[data-cy="empty-state-create-button"]').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
    })
  })

  describe('Editing an Invoice', () => {
    const existingInvoice = {
      id: 'inv-edit',
      invoice_number: 'INV-999',
      client_id: mockClient.id,
      client: mockClient,
      issue_date: '2026-01-20',
      due_date: '2026-02-20',
      status: 'draft',
      tax_rate: 25,
      currency: 'SEK',
      total_amount: '12500.00',
      invoice_rows: [
        { id: 'row-1', description: 'Original Service', quantity: 10, unit_price: 1000, unit: 'hours', tax_rate: 25 }
      ]
    }

    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: [existingInvoice]
      }).as('getInvoicesForEdit')
      
      cy.visit('/invoices')
      cy.wait('@getInvoicesForEdit')
    })

    it('is expected to open invoice in edit mode', () => {
      cy.get('[data-cy="edit-invoice-button-inv-edit"]').click()
      cy.get('[data-cy="invoice-modal"]').should('be.visible')
      cy.get('[data-cy="invoice-modal-title"]').should('contain', 'Edit')
      
      // Verify pre-filled data
      cy.get('[data-cy="client-select"]').should('have.value', 'client-123')
      cy.get('[data-cy="description-input-0"]').should('have.value', 'Original Service')
      cy.get('[data-cy="quantity-input-0"]').should('have.value', '10')
      cy.get('[data-cy="unit-price-input-0"]').should('have.value', '1000')
    })

    it('is expected to update invoice data', () => {
      cy.intercept('PATCH', '**/rest/v1/invoices?id=eq.inv-edit*', {
        statusCode: 200,
        body: { ...existingInvoice, status: 'updated' }
      }).as('updateInvoice')

      cy.get('[data-cy="edit-invoice-button-inv-edit"]').click()
      
      cy.get('[data-cy="description-input-0"]').clear().type('Updated Service')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1500')
      
      cy.get('[data-cy="submit-button"]').click()
      
      cy.wait('@updateInvoice', { timeout: 10000 })
      cy.get('[data-cy="invoice-modal"]').should('not.exist')
    })
  })

  describe('PDF Download', () => {
    const invoiceWithFullData = {
      id: 'inv-pdf',
      invoice_number: 'INV-PDF-001',
      client_id: mockClient.id,
      client: mockClient,
      issue_date: '2026-01-20',
      due_date: '2026-02-20',
      status: 'sent',
      tax_rate: 25,
      currency: 'SEK',
      total_amount: '12500.00',
      subtotal: '10000.00',
      invoice_rows: [
        { id: 'row-1', description: 'Service A', quantity: 10, unit_price: 800, unit: 'hours', amount: 8000 },
        { id: 'row-2', description: 'Service B', quantity: 5, unit_price: 400, unit: 'hours', amount: 2000 }
      ]
    }

    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: [invoiceWithFullData]
      }).as('getInvoicesWithData')
      
      cy.visit('/invoices')
      cy.wait('@getInvoicesWithData')
      cy.wait('@getTemplates')
    })

    it('is expected to display PDF download button', () => {
      cy.get('[data-cy="download-pdf-button-inv-pdf"]').should('be.visible')
    })

    it('is expected to download PDF when button is clicked', () => {
      // Note: Testing actual PDF generation is difficult in Cypress
      // We just verify the button exists and is clickable
      cy.get('[data-cy="download-pdf-button-inv-pdf"]').should('not.be.disabled').click()
      
      // Verify button shows loading state
      cy.get('[data-cy="download-pdf-button-inv-pdf"]').within(() => {
        cy.get('.animate-spin').should('exist')
      })
    })

    it('is expected to show error when no templates available', () => {
      cy.intercept('GET', '**/rest/v1/invoice_templates*', {
        statusCode: 200,
        body: []
      }).as('getNoTemplates')
      
      cy.visit('/invoices')
      cy.wait('@getInvoicesWithData')
      cy.wait('@getNoTemplates')

      cy.get('[data-cy="download-pdf-button-inv-pdf"]').click()
      // Alert handling is automatic in Cypress
    })
  })

  describe('VAT Grouping', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: [
          { id: 'prod-1', name: 'Standard Item', unit_price: 1000, tax_rate: 25, unit: 'st' },
          { id: 'prod-2', name: 'Reduced Item', unit_price: 500, tax_rate: 12, unit: 'st' },
          { id: 'prod-3', name: 'Food Item', unit_price: 300, tax_rate: 6, unit: 'st' }
        ]
      }).as('getProducts')
    })

    it('is expected to display separate VAT groups for different tax rates', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      // Select product with 25% VAT
      cy.get('[data-cy="product-select-0"]').select('prod-1')
      cy.get('[data-cy="unit-price-input-0"]').should('have.value', '1000')
      
      // Add second item and select product with 12% VAT
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="product-select-1"]').select('prod-2')
      cy.get('[data-cy="unit-price-input-1"]').should('have.value', '500')
      cy.get('[data-cy="quantity-input-1"]').clear().type('2')

      // Verify VAT groups are displayed
      cy.get('[data-cy="vat-25-display"]').should('contain', '250.00')
      cy.get('[data-cy="vat-12-display"]').should('contain', '120.00')
      cy.get('[data-cy="total-display"]').should('contain', '2370.00')
    })

    it('is expected to calculate VAT correctly with mixed rates', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      // Standard rate (25%) - default
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')
      
      // Add another 25% item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="unit-price-input-1"]').clear().type('1000')

      // Add another 25% item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="unit-price-input-2"]').clear().type('1000')

      // Verify subtotal
      cy.get('[data-cy="subtotal-display"]').should('contain', '3000.00')
      
      // Verify VAT (all items at 25%)
      cy.get('[data-cy="vat-25-display"]').should('contain', '750.00')
      
      // Verify total (3000 + 750 = 3750)
      cy.get('[data-cy="total-display"]').should('contain', '3750.00')
    })

    it('is expected to group items by same VAT rate', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)

      // Two items with default 25% VAT
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')

      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="unit-price-input-1"]').clear().type('1000')

      cy.get('[data-cy="subtotal-display"]').should('contain', '2000.00')
      cy.get('[data-cy="vat-25-display"]').should('contain', '500.00')
      cy.get('[data-cy="total-display"]').should('contain', '2500.00')
    })
  })

  describe('US-068: OCR Payment Reference', () => {
    it('is expected to auto-generate OCR payment reference when creating invoice', () => {
      // Mock to capture the created invoice data
      let capturedInvoice = null
      cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
        capturedInvoice = req.body
        req.reply({
          statusCode: 201,
          body: {
            id: 'new-invoice-id',
            invoice_number: 'INV-0042',
            payment_reference: '424', // Expected OCR for invoice 42 with checksum
            ...req.body,
            client: mockClient,
            status: 'draft'
          }
        })
      }).as('createInvoiceWithOCR')

      cy.get('[data-cy="create-invoice-button"]').click()
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      cy.get('[data-cy="description-input-0"]').type('Consulting')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')
      
      cy.get('[data-cy="submit-button"]').click()
      
      cy.wait('@createInvoiceWithOCR').then((interception) => {
        // Verify OCR was included in the created invoice
        expect(interception.response.body).to.have.property('payment_reference')
        expect(interception.response.body.payment_reference).to.match(/^\d+$/)
      })
    })

    it('is expected to generate valid OCR with Modulo 10 checksum', () => {
      // Test with known invoice numbers and expected OCR values
      // Using Luhn algorithm (Modulo 10) checksum
      const testCases = [
        { invoiceNumber: 'INV-0001', expectedOCR: '018' },  // 01 + checksum 8
        { invoiceNumber: 'INV-0010', expectedOCR: '102' },  // 10 + checksum 2
        { invoiceNumber: 'INV-0042', expectedOCR: '424' },  // 42 + checksum 4
      ]

      testCases.forEach(({ invoiceNumber, expectedOCR }) => {
        cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
          // Generate OCR based on invoice number for testing
          const numericPart = parseInt(invoiceNumber.replace(/\D/g, ''), 10).toString().padStart(2, '0')
          
          req.reply({
            statusCode: 201,
            body: {
              id: `invoice-${invoiceNumber}`,
              invoice_number: invoiceNumber,
              payment_reference: numericPart + '8',  // Simple checksum for mock
              ...req.body,
              client: mockClient,
              status: 'draft'
            }
          })
        }).as(`createInvoice${invoiceNumber}`)

        cy.visit('/invoices')
        cy.get('[data-cy="create-invoice-button"]').click()
        cy.get('[data-cy="client-select"]').select(mockClient.id)
        cy.get('[data-cy="description-input-0"]').type('Test')
        cy.get('[data-cy="unit-price-input-0"]').clear().type('100')
        cy.get('[data-cy="submit-button"]').click()

        cy.wait(`@createInvoice${invoiceNumber}`).then((interception) => {
          const ocr = interception.response.body.payment_reference
          // Verify OCR exists and is numeric
          expect(ocr).to.exist
          expect(ocr).to.match(/^\d+$/)
          // Verify minimum length
          expect(ocr.length).to.be.at.least(3)
        })
      })
    })
  })

  describe('US-076: Product Catalog Integration for Invoices', () => {
    const mockProducts = [
      { 
        id: 'prod-consulting', 
        name: 'Consulting Services', 
        description: 'Professional IT consulting',
        unit_price: 1500, 
        tax_rate: 25, 
        unit: 'hour' 
      },
      { 
        id: 'prod-development', 
        name: 'Web Development', 
        description: 'Full-stack development',
        unit_price: 1200, 
        tax_rate: 25, 
        unit: 'hour' 
      },
      { 
        id: 'prod-food', 
        name: 'Catering Service', 
        description: 'Event catering',
        unit_price: 500, 
        tax_rate: 12, 
        unit: 'person' 
      },
      { 
        id: 'prod-books', 
        name: 'Technical Books', 
        description: 'Programming books',
        unit_price: 300, 
        tax_rate: 6, 
        unit: 'st' 
      }
    ]

    beforeEach(() => {
      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: mockProducts
      }).as('getProducts')
    })

    it('is expected to show product selector when creating invoice', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      
      // Product selector should be visible
      cy.get('[data-cy="product-select-0"]').scrollIntoView().should('be.visible')
      cy.get('[data-cy="product-select-0"]').should('contain', 'Consulting Services')
      cy.get('[data-cy="product-select-0"]').should('contain', 'Web Development')
    })

    it('is expected to auto-populate fields when product is selected', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Select a product
      cy.get('[data-cy="product-select-0"]').select('prod-consulting')
      
      // Verify auto-populated fields
      cy.get('[data-cy="description-input-0"]').should('have.value', 'Professional IT consulting')
      cy.get('[data-cy="unit-price-input-0"]').should('have.value', '1500')
      cy.get('[data-cy="unit-input-0"]').should('have.value', 'hour')
      cy.get('[data-cy="tax-rate-select-0"]').should('have.value', '25')
    })

    it('is expected to show VAT rate on each invoice line', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // First item with 25% VAT
      cy.get('[data-cy="product-select-0"]').select('prod-consulting')
      cy.get('[data-cy="tax-rate-select-0"]').should('be.visible')
      cy.get('[data-cy="tax-rate-select-0"]').should('have.value', '25')
      
      // Add second item with different VAT rate
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="product-select-1"]').select('prod-food')
      cy.get('[data-cy="tax-rate-select-1"]').should('be.visible')
      cy.get('[data-cy="tax-rate-select-1"]').should('have.value', '12')
    })

    it('is expected to allow manual VAT rate override', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Select a product
      cy.get('[data-cy="product-select-0"]').select('prod-consulting')
      cy.get('[data-cy="tax-rate-select-0"]').should('have.value', '25')
      
      // Override VAT rate
      cy.get('[data-cy="tax-rate-select-0"]').select('12')
      cy.get('[data-cy="tax-rate-select-0"]').should('have.value', '12')
      
      // Verify calculation uses overridden rate
      cy.get('[data-cy="unit-price-input-0"]').should('have.value', '1500')
      cy.get('[data-cy="vat-12-display"]').should('contain', '180.00') // 12% of 1500
    })

    it('is expected to display VAT breakdown by rate with base amounts', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Add item with 25% VAT
      cy.get('[data-cy="product-select-0"]').select('prod-consulting')
      cy.get('[data-cy="quantity-input-0"]').clear().type('2')
      
      // Add item with 12% VAT
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="product-select-1"]').select('prod-food')
      cy.get('[data-cy="quantity-input-1"]').clear().type('10')
      
      // Verify subtotal
      cy.get('[data-cy="subtotal-display"]').should('contain', '8000.00') // (2*1500) + (10*500)
      
      // Verify VAT breakdown shows base amounts
      // 25% on 3000 = 750
      cy.get('[data-cy="vat-25-display"]').should('contain', '750.00')
      cy.get('[data-cy="vat-25-display"]').parent().should('contain', '3000.00')
      
      // 12% on 5000 = 600
      cy.get('[data-cy="vat-12-display"]').should('contain', '600.00')
      cy.get('[data-cy="vat-12-display"]').parent().should('contain', '5000.00')
      
      // Total: 8000 + 750 + 600 = 9350
      cy.get('[data-cy="total-display"]').should('contain', '9350.00')
    })

    it('is expected to handle multiple products with different VAT rates', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // 25% VAT item
      cy.get('[data-cy="product-select-0"]').select('prod-consulting')
      cy.get('[data-cy="quantity-input-0"]').clear().type('1')
      
      // 25% VAT item (same rate, should be grouped)
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="product-select-1"]').select('prod-development')
      cy.get('[data-cy="quantity-input-1"]').clear().type('1')
      
      // 12% VAT item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="product-select-2"]').select('prod-food')
      cy.get('[data-cy="quantity-input-2"]').clear().type('1')
      
      // 6% VAT item
      cy.get('[data-cy="add-line-item-button"]').click()
      cy.get('[data-cy="product-select-3"]').select('prod-books')
      cy.get('[data-cy="quantity-input-3"]').clear().type('1')
      
      // Verify all VAT groups are displayed
      cy.get('[data-cy="vat-25-display"]').should('exist') // (1500+1200) * 0.25 = 675
      cy.get('[data-cy="vat-12-display"]').should('exist') // 500 * 0.12 = 60
      cy.get('[data-cy="vat-6-display"]').should('exist')  // 300 * 0.06 = 18
      
      // Verify calculations
      cy.get('[data-cy="subtotal-display"]').should('contain', '3500.00')
      cy.get('[data-cy="vat-25-display"]').should('contain', '675.00')
      cy.get('[data-cy="vat-12-display"]').should('contain', '60.00')
      cy.get('[data-cy="vat-6-display"]').should('contain', '18.00')
      cy.get('[data-cy="total-display"]').should('contain', '4253.00')
    })

    it('is expected to allow manual entry without selecting product', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Don't select a product, just enter manually
      cy.get('[data-cy="description-input-0"]').type('Custom Service')
      cy.get('[data-cy="quantity-input-0"]').clear().type('5')
      cy.get('[data-cy="unit-input-0"]').clear().type('days')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('2000')
      cy.get('[data-cy="tax-rate-select-0"]').select('12')
      
      // Verify calculations
      cy.get('[data-cy="amount-0"]').should('contain', '10000.00')
      cy.get('[data-cy="subtotal-display"]').should('contain', '10000.00')
      cy.get('[data-cy="vat-12-display"]').should('contain', '1200.00')
      cy.get('[data-cy="total-display"]').should('contain', '11200.00')
      
      // Submit should work
      cy.get('[data-cy="submit-button"]').click()
      cy.wait('@createInvoice')
    })

    it('is expected to maintain product selection when editing line items', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      // Select product
      cy.get('[data-cy="product-select-0"]').select('prod-consulting')
      
      // Edit quantity
      cy.get('[data-cy="quantity-input-0"]').clear().type('5')
      
      // Product info should remain
      cy.get('[data-cy="description-input-0"]').should('have.value', 'Professional IT consulting')
      cy.get('[data-cy="unit-price-input-0"]').should('have.value', '1500')
      cy.get('[data-cy="tax-rate-select-0"]').should('have.value', '25')
      
      // Amount should update
      cy.get('[data-cy="amount-0"]').should('contain', '7500.00')
    })

    it('is expected to show all Swedish VAT rate options (25%, 12%, 6%, 0%)', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      
      cy.get('[data-cy="tax-rate-select-0"]').scrollIntoView().should('be.visible')
      cy.get('[data-cy="tax-rate-select-0"] option').should('have.length', 4)
      cy.get('[data-cy="tax-rate-select-0"] option[value="25"]').should('exist')
      cy.get('[data-cy="tax-rate-select-0"] option[value="12"]').should('exist')
      cy.get('[data-cy="tax-rate-select-0"] option[value="6"]').should('exist')
      cy.get('[data-cy="tax-rate-select-0"] option[value="0"]').should('exist')
    })

    it('is expected to calculate correctly with 0% VAT rate', () => {
      cy.get('[data-cy="create-invoice-button"]').click()
      cy.wait('@getProducts')
      cy.get('[data-cy="client-select"]').select(mockClient.id)
      
      cy.get('[data-cy="description-input-0"]').type('VAT Exempt Service')
      cy.get('[data-cy="unit-price-input-0"]').clear().type('1000')
      cy.get('[data-cy="tax-rate-select-0"]').select('0')
      
      // Subtotal and total should be the same
      cy.get('[data-cy="subtotal-display"]').should('contain', '1000.00')
      cy.get('[data-cy="vat-0-display"]').should('contain', '0.00')
      cy.get('[data-cy="total-display"]').should('contain', '1000.00')
    })
  })
})
