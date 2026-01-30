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
    name: 'ACME Corp',
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

    cy.login('admin')
    cy.wait('@getInvoices')
  })

  describe('Happy Path - Send Email on Invoice Creation', () => {
    it('is expected to send email when "Send Invoice" button is clicked', () => {
      // Intercept invoice creation
      cy.intercept('POST', '**/rest/v1/invoices', {
        statusCode: 201,
        body: [{
          ...mockInvoice,
          id: 'new-invoice-id',
          invoice_number: 'INV-002',
          status: 'sent',
          sent_at: new Date().toISOString(),
        }],
      }).as('createInvoice')

      // Intercept email sending Edge Function
      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        body: {
          success: true,
          messageId: 'test-message-id',
          to: mockClient.email,
        },
      }).as('sendEmail')

      // Open invoice modal
      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()

      // Fill in invoice details
      cy.getByCy('client-select').select(mockClient.id)
      
      cy.getByCy('issue-date-input').clear().type('2026-01-20')
      cy.getByCy('due-date-input').clear().type('2026-02-20')

      // Add invoice line item
      cy.get('input[name="description"]').first().type('Consulting Services')
      cy.get('input[name="quantity"]').first().clear().type('5')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

      // Click "Send Invoice" button
      cy.getByCy('send-invoice-button').click()

      // Wait for invoice creation
      cy.wait('@createInvoice')

      // Wait for email to be sent
      cy.wait('@sendEmail').its('request.body').should('deep.equal', {
        invoiceId: 'new-invoice-id',
      })

      // Verify success toast messages
      cy.contains('Invoice sent successfully').should('be.visible')
      cy.contains('Invoice emailed to client successfully').should('be.visible')
    })

    it('is expected to send email when marking draft invoice as sent', () => {
      // Intercept mark as sent
      cy.intercept('PATCH', `**/rest/v1/invoices?id=eq.${mockInvoice.id}`, {
        statusCode: 200,
        body: [{
          ...mockInvoice,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }],
      }).as('markAsSent')

      // Intercept email sending
      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        body: {
          success: true,
          messageId: 'test-message-id',
          to: mockClient.email,
        },
      }).as('sendEmail')

      cy.getByCy('sidebar-nav-invoices').click()

      // Find and click "Mark as Sent" button
      cy.getByCy(`mark-sent-button-${mockInvoice.id}`).click()

      // Wait for update and email
      cy.wait('@markAsSent')
      cy.wait('@sendEmail')

      // Verify alert with success message
      cy.on('window:alert', (text) => {
        expect(text).to.contain('Invoice emailed to client successfully')
      })
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

      cy.setupCommonIntercepts({
        clients: [mockClient],
        invoices: [overdueInvoice],
        organizations: [mockOrganization],
      })

      // Intercept mark reminder sent
      cy.intercept('PATCH', `**/rest/v1/invoices?id=eq.${overdueInvoice.id}`, {
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

      // Click send reminder button
      cy.getByCy(`send-reminder-button-${overdueInvoice.id}`).click()

      // Wait for operations
      cy.wait('@markReminderSent')
      cy.wait('@sendReminderEmail')

      // Verify alert with success message
      cy.on('window:alert', (text) => {
        expect(text).to.contain('Invoice emailed to client successfully')
      })
    })
  })

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to show error when client has no email address', () => {
      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()

      // Select client without email
      cy.getByCy('client-select').select(mockClientWithoutEmail.id)

      // Add invoice line item
      cy.get('input[name="description"]').first().type('Test Service')
      cy.get('input[name="quantity"]').first().clear().type('1')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

      // Try to send invoice
      cy.getByCy('send-invoice-button').click()

      // Verify error message
      cy.contains('Client email is required to send invoice').should('be.visible')

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

      // Fill in invoice details
      cy.getByCy('client-select').select(mockClient.id)

      cy.get('input[name="description"]').first().type('Test Service')
      cy.get('input[name="quantity"]').first().clear().type('1')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

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
      // Intercept invoice creation
      cy.intercept('POST', '**/rest/v1/invoices', {
        statusCode: 201,
        body: [{
          ...mockInvoice,
          id: 'new-invoice-timeout-id',
          invoice_number: 'INV-TIMEOUT',
          status: 'sent',
        }],
      }).as('createInvoice')

      // Intercept email with delay/timeout
      cy.intercept('POST', '**/functions/v1/send-invoice-email', (req) => {
        req.destroy() // Simulate network error
      }).as('sendEmailTimeout')

      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()

      cy.getByCy('client-select').select(mockClient.id)

      cy.get('input[name="description"]').first().type('Test Service')
      cy.get('input[name="quantity"]').first().clear().type('1')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

      cy.getByCy('send-invoice-button').click()

      cy.wait('@createInvoice')

      // Verify error toast shows
      cy.contains('Failed to send email').should('be.visible')
    })
  })

  describe('Edge Function Integration', () => {
    it('is expected to pass correct invoice ID to email service', () => {
      const testInvoiceId = 'test-specific-invoice-id'

      cy.intercept('POST', '**/rest/v1/invoices', {
        statusCode: 201,
        body: [{
          ...mockInvoice,
          id: testInvoiceId,
          status: 'sent',
        }],
      }).as('createInvoice')

      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 200,
        body: { success: true, messageId: 'test-id', to: mockClient.email },
      }).as('sendEmail')

      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()

      cy.getByCy('client-select').select(mockClient.id)

      cy.get('input[name="description"]').first().type('Test Service')
      cy.get('input[name="quantity"]').first().clear().type('1')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

      cy.getByCy('send-invoice-button').click()

      cy.wait('@createInvoice')
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

      cy.getByCy('client-select').select(mockClient.id)

      cy.get('input[name="description"]').first().type('Test Service')
      cy.get('input[name="quantity"]').first().clear().type('1')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

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
      cy.intercept('POST', '**/rest/v1/invoices', {
        statusCode: 201,
        body: [{
          ...mockInvoice,
          id: 'draft-invoice-id',
          invoice_number: 'INV-DRAFT',
          status: 'draft',
          sent_at: null,
        }],
      }).as('createDraft')

      // Email should NOT be called when saving draft
      cy.intercept('POST', '**/functions/v1/send-invoice-email').as('sendEmailNotCalled')

      cy.getByCy('sidebar-nav-invoices').click()
      cy.getByCy('create-invoice-button').click()

      cy.getByCy('client-select').select(mockClient.id)

      cy.get('input[name="description"]').first().type('Test Service')
      cy.get('input[name="quantity"]').first().clear().type('1')
      cy.get('input[name="unit_price"]').first().clear().type('1000')

      // Click "Save as Draft" instead of "Send Invoice"
      cy.getByCy('save-draft-button').click()

      cy.wait('@createDraft')

      // Verify email was NOT sent
      cy.get('@sendEmailNotCalled.all').should('have.length', 0)

      // Verify success message (draft saved, not sent)
      cy.contains('Draft saved successfully').should('be.visible')
      cy.contains('emailed').should('not.exist')
    })
  })
})
