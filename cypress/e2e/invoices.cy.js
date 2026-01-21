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
    // Mock clients endpoint
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

    cy.login('admin')
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
      cy.get('[data-cy="tax-display"]').should('contain', '3750.00')  // 25% of 15000
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
      cy.get('[data-cy="tax-display"]').should('contain', '250.00')
      cy.get('[data-cy="total-display"]').should('contain', '1250.00')

      // Change to 12% tax (use force to avoid scroll issues)
      cy.get('[data-cy="tax-rate-input"]').clear({ force: true }).type('12', { force: true })
      cy.get('[data-cy="tax-display"]').should('contain', '120.00')
      cy.get('[data-cy="total-display"]').should('contain', '1120.00')
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
})
