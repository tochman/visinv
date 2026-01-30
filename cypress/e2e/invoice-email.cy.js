// US-008: Invoice Email Delivery
// Tests for sending invoice emails via Resend integration

describe('US-008: Invoice Email Delivery', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization AB',
    user_id: mockUser.id,
    invoice_numbering_mode: 'automatic',
    invoice_counter: 1,
    email: 'org@example.com',
  }

  const mockClient = {
    id: 'test-client-id',
    name: 'Test Client AB',
    email: 'client@example.com',
    org_number: '556677-8899',
    address: 'Test Street 123',
    postal_code: '12345',
    city: 'Stockholm',
    country: 'Sweden',
    user_id: mockUser.id,
  }

  const mockClientWithoutEmail = {
    id: 'test-client-no-email-id',
    name: 'No Email Client',
    email: null, // Missing email
    org_number: '556688-9900',
    address: 'Test Street 456',
    postal_code: '54321',
    city: 'Gothenburg',
    country: 'Sweden',
    user_id: mockUser.id,
  }

  const mockProduct = {
    id: 'test-product-id',
    name: 'Test Product',
    description: 'Test product description',
    unit: 'st',
    user_id: mockUser.id,
  }

  const mockInvoice = {
    id: 'test-invoice-id',
    invoice_number: 'INV-001',
    client_id: mockClient.id,
    organization_id: mockOrganization.id,
    issue_date: '2026-01-20',
    due_date: '2026-02-20',
    delivery_date: '2026-01-21',
    status: 'draft',
    tax_rate: 25,
    currency: 'SEK',
    total_amount: '1250.00',
    subtotal: '1000.00',
    user_id: mockUser.id,
    client: mockClient,
    organization: mockOrganization,
    invoice_rows: [
      {
        id: 'row-1',
        description: 'Test Service',
        quantity: 1,
        unit_price: 1000,
        unit: 'st',
        tax_rate: 25,
      },
    ],
  }

  beforeEach(() => {
    cy.setupCommonIntercepts({
      clients: [mockClient, mockClientWithoutEmail],
      products: [mockProduct],
      invoices: [mockInvoice],
      organizations: [mockOrganization],
    })

    // Mock invoice creation - POST returns from .single()
    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      const invoice = {
        id: 'new-invoice-id',
        invoice_number: 'INV-0002',
        ...req.body,
        client: mockClient,
      }
      req.reply({
        statusCode: 201,
        body: invoice,
      })
    }).as('createInvoice')

    // Mock the GET request that Invoice.create() makes after POST (via this.show())
    // This is called to fetch the complete invoice with relations
    // The URL pattern is: /rest/v1/invoices?select=...&id=eq.new-invoice-id
    cy.intercept('GET', '**/rest/v1/invoices*id=eq.new-invoice-id*', {
      statusCode: 200,
      body: {
        id: 'new-invoice-id',
        invoice_number: 'INV-0002',
        status: 'sent',
        client_id: mockClient.id,
        client: mockClient,
        invoice_rows: [],
      },
    }).as('getCreatedInvoice')

    // Mock invoice rows
    cy.intercept('POST', '**/rest/v1/invoice_rows*', {
      statusCode: 201,
      body: [],
    }).as('createInvoiceRows')

    cy.login('admin')
    cy.getByCy('sidebar-nav-invoices').click()
    cy.wait('@getInvoices')
  })

  describe('Happy Path - Send Email on Invoice Creation', () => {
    it('is expected to send email when "Send Invoice" button is clicked', () => {
      // Intercept email sending Edge Function
      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        body: {
          success: true,
          messageId: 'test-message-id',
          to: mockClient.email,
        },
      }).as('sendEmail')

      cy.getByCy("create-invoice-button").should("be.visible").click();
      cy.getByCy("invoice-modal").should("be.visible");

      // Wait for clients and products to load
      cy.wait("@getClients");
      cy.wait("@getProducts");

      // Select client
      cy.getByCy("client-select").should("be.visible").select("Test Client AB");

      // Add line item
      cy.getByCy("description-input-0").type("Consulting Services");
      cy.getByCy("quantity-input-0").clear().type("10");
      cy.getByCy("unit-input-0").clear().type("hours");
      cy.getByCy("unit-price-input-0").clear().type("1500");

      // Verify totals
      cy.getByCy("subtotal-display").should("contain", "15000.00");
      cy.getByCy("total-display").should("contain", "18750.00");

      // Use "Send Invoice" button
      cy.getByCy("send-invoice-button").scrollIntoView().click();

      cy.wait("@createInvoice").then((interception) => {
        // Verify that status and sent_at were set
        expect(interception.request.body.status).to.equal('sent');
        expect(interception.request.body.sent_at).to.exist;
      });

      // Wait for email to be sent (longer timeout for edge function call)
      cy.wait('@sendEmail', { timeout: 10000 })

      cy.getByCy("invoice-modal").should("not.exist");
    })

    // Skipped: mark as sent functionality is tested in invoices.cy.js
    // This test would require setting up a draft invoice in the list with the mark-sent button visible
    it.skip('is expected to send email when marking draft invoice as sent', () => {
      // Test implementation would go here
    })

    it('is expected to send reminder email when "Send Reminder" is clicked', () => {
      const overdueInvoice = {
        ...mockInvoice,
        id: 'overdue-invoice-id',
        invoice_number: 'INV-OVERDUE',
        status: 'sent',
        sent_at: '2026-01-01T00:00:00Z',
        due_date: '2026-01-05',
        reminder_count: 0,
        reminder_sent_at: null,
      }

      // Re-setup intercepts with overdue invoice
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: [overdueInvoice],
      }).as('getInvoices')

      // Intercept mark reminder sent
      cy.intercept('PATCH', `**/rest/v1/invoices?id=eq.${overdueInvoice.id}*`, {
        statusCode: 200,
        body: [{
          ...overdueInvoice,
          reminder_count: 1,
          reminder_sent_at: new Date().toISOString(),
        }],
      }).as('markReminderSent')

      // Intercept email sending
      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        body: {
          success: true,
          messageId: 'reminder-message-id',
          to: mockClient.email,
        },
      }).as('sendReminderEmail')

      cy.visit('/')
      cy.wait('@getInvoices')

      cy.getByCy('sidebar-nav-invoices').click()

      // Click send reminder button - use window alert stub
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alertStub')
      })

      cy.getByCy(`send-reminder-button-${overdueInvoice.id}`).click()

      // Wait for operations
      cy.wait('@markReminderSent')
      cy.wait('@sendReminderEmail')

      // Verify alert with success message
      cy.get('@alertStub').should('have.been.calledOnce')
    })
  })

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to show error when client has no email address', () => {
      cy.getByCy('create-invoice-button').click()
      cy.getByCy('invoice-modal').should('be.visible')

      // Wait for clients to load
      cy.wait('@getClients')
      cy.wait('@getProducts')

      // Select client without email (by name)
      cy.getByCy('client-select').should('be.visible').select('No Email Client')

      // Add invoice line item
      cy.getByCy('description-input-0').type('Test Service')
      cy.getByCy('quantity-input-0').clear().type('1')
      cy.getByCy('unit-price-input-0').clear().type('1000')

      // Try to send invoice
      cy.getByCy('send-invoice-button').scrollIntoView().click()

      // Verify error message about email exists and contains correct text
      cy.getByCy('invoice-form-error')
        .should('exist')
        .and('contain', 'Client email is required')

      // Modal should still be open
      cy.getByCy('invoice-modal').should('be.visible')
    })

    it('is expected to show error when email service fails', () => {
      // Intercept invoice creation successfully
      cy.intercept('POST', '**/rest/v1/invoices', {
        statusCode: 201,
        body: [{
          ...mockInvoice,
          id: 'new-invoice-fail-email-id',
          invoice_number: 'INV-FAIL',
          status: 'sent',
          sent_at: new Date().toISOString(),
        }],
      }).as('createInvoice')

      // Intercept email sending with failure
      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 500,
        body: {
          error: 'Failed to send email',
          details: 'Resend API error',
        },
      }).as('sendEmailFail')

      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()
      cy.getByCy('invoice-modal').should('be.visible')

      // Wait for clients to load
      cy.wait('@getClients')

      // Fill in invoice details
      cy.getByCy('client-select').should('be.visible').select(mockClient.id)

      cy.getByCy('description-input-0').type('Test Service')
      cy.getByCy('quantity-input-0').clear().type('1')
      cy.getByCy('unit-price-input-0').clear().type('1000')

      // Click "Send Invoice"
      cy.getByCy('send-invoice-button').click()

      // Wait for invoice creation and email attempt
      cy.wait('@createInvoice')
      cy.wait('@sendEmailFail')

      // Verify error toast appears
      cy.contains('Failed to send email to client').should('be.visible')

      // Modal should close (invoice was created successfully)
      cy.getByCy('invoice-modal').should('not.exist')
    })

    it('is expected to handle email service timeout gracefully', () => {
      // Intercept email with network error
      cy.intercept('POST', '**/functions/v1/send-invoice-email', (req) => {
        req.destroy() // Simulate network error
      }).as('sendEmailTimeout')

      cy.getByCy('create-invoice-button').click()
      cy.getByCy('invoice-modal').should('be.visible')

      cy.wait('@getClients')
      cy.wait('@getProducts')

      cy.getByCy('client-select').should('be.visible').select('Test Client AB')

      cy.getByCy('description-input-0').type('Test Service')
      cy.getByCy('quantity-input-0').clear().type('1')
      cy.getByCy('unit-price-input-0').clear().type('1000')

      cy.getByCy('send-invoice-button').scrollIntoView().click()

      cy.wait('@createInvoice')

      // Verify error toast shows
      cy.contains('Failed to send email').should('be.visible')
    })
  })

  describe('Edge Function Integration', () => {
    it('is expected to pass correct invoice ID to email service', () => {
      const testInvoiceId = 'test-specific-invoice-id'

      // Override the POST intercept with our specific ID
      cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
        req.reply({
          statusCode: 201,
          body: {
            ...mockInvoice,
            id: testInvoiceId,
            status: 'sent',
          },
        })
      }).as('createInvoiceSpecific')

      // Override the GET intercept for fetching the created invoice
      cy.intercept('GET', `**/rest/v1/invoices*id=eq.${testInvoiceId}*`, {
        statusCode: 200,
        body: {
          id: testInvoiceId,
          invoice_number: 'INV-SPECIFIC',
          status: 'sent',
          client_id: mockClient.id,
          client: mockClient,
          invoice_rows: [],
        },
      }).as('getSpecificInvoice')

      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        body: { success: true, messageId: 'test-id', to: mockClient.email },
      }).as('sendEmail')

      cy.getByCy('create-invoice-button').click()
      cy.getByCy('invoice-modal').should('be.visible')

      // Wait for clients to load
      cy.wait('@getClients')
      cy.wait('@getProducts')

      cy.getByCy('client-select').should('be.visible').select('Test Client AB')

      cy.getByCy('description-input-0').type('Test Service')
      cy.getByCy('quantity-input-0').clear().type('1')
      cy.getByCy('unit-price-input-0').clear().type('1000')

      cy.getByCy('send-invoice-button').scrollIntoView().click()

      cy.wait('@createInvoiceSpecific')
      cy.wait('@sendEmail').then((interception) => {
        expect(interception.request.body).to.deep.equal({
          invoiceId: testInvoiceId,
        })
      })
    })
  })

  describe('User Feedback', () => {
    it('is expected to show "Sending email..." toast while email is being sent', () => {
      cy.intercept('POST', '**/rest/v1/invoices', {
        statusCode: 201,
        body: [{
          ...mockInvoice,
          id: 'new-invoice-id',
          status: 'sent',
        }],
      }).as('createInvoice')

      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        delay: 1000, // Add delay to see loading toast
        body: { success: true, messageId: 'test-id', to: mockClient.email },
      }).as('sendEmail')

      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()
      cy.getByCy('invoice-modal').should('be.visible')

      // Wait for clients to load
      cy.wait('@getClients')

      cy.getByCy('client-select').should('be.visible').select(mockClient.id)

      cy.getByCy('description-input-0').type('Test Service')
      cy.getByCy('quantity-input-0').clear().type('1')
      cy.getByCy('unit-price-input-0').clear().type('1000')

      cy.getByCy('send-invoice-button').click()

      cy.wait('@createInvoice')

      // Verify "Sending email..." appears
      cy.contains('Sending email').should('be.visible')

      cy.wait('@sendEmail')

      // Verify success message
      cy.contains('Invoice emailed to client successfully').should('be.visible')
    })
  })

  describe('Draft to Sent Workflow', () => {
    it('is expected to save draft without sending email', () => {
      // Override the POST intercept for draft creation
      cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
        req.reply({
          statusCode: 201,
          body: {
            ...mockInvoice,
            id: 'draft-invoice-id',
            invoice_number: 'INV-DRAFT',
            status: 'draft',
            sent_at: null,
          },
        })
      }).as('createDraft')

      // Override the GET intercept for fetching the created draft
      cy.intercept('GET', '**/rest/v1/invoices*id=eq.draft-invoice-id*', {
        statusCode: 200,
        body: {
          id: 'draft-invoice-id',
          invoice_number: 'INV-DRAFT',
          status: 'draft',
          client_id: mockClient.id,
          client: mockClient,
          invoice_rows: [],
        },
      }).as('getDraftInvoice')

      // Email should NOT be called when saving draft
      cy.intercept('POST', '**/functions/v1/send-invoice-email').as('sendEmailNotCalled')

      cy.getByCy('create-invoice-button').click()
      cy.getByCy('invoice-modal').should('be.visible')

      // Wait for clients to load
      cy.wait('@getClients')
      cy.wait('@getProducts')

      cy.getByCy('client-select').should('be.visible').select('Test Client AB')

      cy.getByCy('description-input-0').type('Test Service')
      cy.getByCy('quantity-input-0').clear().type('1')
      cy.getByCy('unit-price-input-0').clear().type('1000')

      // Click "Save as Draft" instead of "Send Invoice"
      cy.getByCy('save-draft-button').scrollIntoView().click()

      cy.wait('@createDraft')

      // Wait a moment then verify email was NOT sent
      cy.wait(500)
      cy.get('@sendEmailNotCalled.all').should('have.length', 0)

      // Verify success message (draft saved, not sent)
      cy.contains('Draft saved successfully').should('be.visible')
    })
  })
})
