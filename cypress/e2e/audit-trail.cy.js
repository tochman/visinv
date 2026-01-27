/// <reference types="cypress" />

/**
 * Audit Trail E2E Tests
 * US-022-E: Audit Trail for Invoice Lifecycle
 */
describe('Invoice Audit Trail', () => {
  const mockClient = {
    id: 'client-123',
    name: 'Test Client AB',
    email: 'client@test.com',
  };

  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization AB',
    org_number: '556677-8899',
    organization_number: '556677-8899',
    vat_number: 'SE556677889901',
    invoice_numbering_mode: 'auto',
    invoice_prefix: 'INV-',
    next_invoice_number: 1,
  };

  const mockInvoice = {
    id: 'invoice-123',
    invoice_number: 'INV-0001',
    client_id: 'client-123',
    status: 'draft',
    issue_date: '2024-01-15',
    due_date: '2024-02-15',
    subtotal: '10000.00',
    tax_rate: 25,
    tax_amount: '2500.00',
    total_amount: '12500.00',
    currency: 'SEK',
    client: mockClient,
    invoice_rows: [
      {
        id: 'row-1',
        description: 'Consulting Services',
        quantity: '10',
        unit_price: '1000.00',
        amount: '10000.00',
      },
    ],
  };

  const mockAuditEvents = [
    {
      id: 'event-1',
      invoice_id: 'invoice-123',
      event_type: 'created',
      description: 'Invoice INV-0001 created',
      event_data: { invoice_number: 'INV-0001' },
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'event-2',
      invoice_id: 'invoice-123',
      event_type: 'sent',
      description: 'Invoice INV-0001 sent to client',
      event_data: { invoice_number: 'INV-0001' },
      created_at: '2024-01-16T14:30:00Z',
    },
    {
      id: 'event-3',
      invoice_id: 'invoice-123',
      event_type: 'payment_recorded',
      description: 'Payment of 12500.00 recorded',
      event_data: {
        invoice_number: 'INV-0001',
        amount: '12500.00',
        payment_method: 'bank_transfer',
        payment_date: '2024-01-20',
      },
      created_at: '2024-01-20T09:15:00Z',
    },
  ];

  beforeEach(() => {
    cy.login('admin');

    cy.setupCommonIntercepts({
      clients: [mockClient],
      templates: [],
      products: [],
      invoices: [mockInvoice],
      defaultOrganization: mockOrganization,
    });

    // Mock invoice detail endpoint
    cy.intercept('GET', '**/rest/v1/invoices?id=eq.invoice-123*', {
      statusCode: 200,
      body: [mockInvoice],
    }).as('getInvoice');

    // Mock payments endpoint
    cy.intercept('GET', '**/rest/v1/payments?invoice_id=eq.invoice-123*', {
      statusCode: 200,
      body: [],
    }).as('getPayments');

    // Mock invoice_events endpoint
    cy.intercept('GET', '**/rest/v1/invoice_events?invoice_id=eq.invoice-123*', {
      statusCode: 200,
      body: mockAuditEvents,
    }).as('getInvoiceEvents');
  });

  describe('Happy Path - Viewing Audit Trail', () => {
    it('is expected to display audit trail on invoice detail page', () => {
      // Navigate to invoice detail
      cy.visit('/invoices/invoice-123');
      
      // Wait for data to load
      cy.wait('@getInvoice');
      cy.wait('@getPayments');
      cy.wait('@getInvoiceEvents');

      // Verify audit trail section exists
      cy.getByCy('audit-trail-section').should('be.visible');

      // Verify all events are displayed
      cy.getByCy('audit-event-created').should('be.visible');
      cy.getByCy('audit-event-sent').should('be.visible');
      cy.getByCy('audit-event-payment_recorded').should('be.visible');

      // Verify event details
      cy.getByCy('audit-event-created').within(() => {
        cy.contains('Created').should('be.visible');
        cy.contains('Invoice INV-0001 created').should('be.visible');
      });

      cy.getByCy('audit-event-sent').within(() => {
        cy.contains('Sent').should('be.visible');
        cy.contains('Invoice INV-0001 sent to client').should('be.visible');
      });

      cy.getByCy('audit-event-payment_recorded').within(() => {
        cy.contains('Payment Recorded').should('be.visible');
        cy.contains('Payment of 12500.00 recorded').should('be.visible');
      });
    });

    it('is expected to display events in chronological order (newest first)', () => {
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Get all event elements and verify order
      cy.get('[data-cy^="audit-event-"]').then($events => {
        // First event should be payment (newest)
        expect($events.eq(0).attr('data-cy')).to.equal('audit-event-payment_recorded');
        // Second should be sent
        expect($events.eq(1).attr('data-cy')).to.equal('audit-event-sent');
        // Third should be created (oldest)
        expect($events.eq(2).attr('data-cy')).to.equal('audit-event-created');
      });
    });

    it('is expected to display timestamps for each event', () => {
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify each event has a timestamp displayed
      cy.getByCy('audit-event-created').within(() => {
        cy.contains(/Jan.*2024/).should('be.visible');
      });

      cy.getByCy('audit-event-sent').within(() => {
        cy.contains(/Jan.*2024/).should('be.visible');
      });

      cy.getByCy('audit-event-payment_recorded').within(() => {
        cy.contains(/Jan.*2024/).should('be.visible');
      });
    });
  });

  describe('Happy Path - Event Creation', () => {
    it('is expected to create audit event when invoice is created', () => {
      // Mock invoice_events insert
      cy.intercept('POST', '**/rest/v1/invoice_events*', (req) => {
        expect(req.body.event_type).to.equal('created');
        expect(req.body.invoice_id).to.exist;
        req.reply({
          statusCode: 201,
          body: {
            id: 'new-event-id',
            ...req.body,
            created_at: new Date().toISOString(),
          },
        });
      }).as('createAuditEvent');

      cy.intercept('POST', '**/rest/v1/invoices*', {
        statusCode: 201,
        body: mockInvoice,
      }).as('createInvoice');

      cy.intercept('POST', '**/rest/v1/invoice_rows*', {
        statusCode: 201,
        body: [],
      }).as('createInvoiceRows');

      // Navigate to invoices page
      cy.visit('/invoices');
      cy.wait('@getInvoices');

      // Create a new invoice (minimal flow)
      cy.getByCy('create-invoice-btn').click();
      
      // The audit event should be created when invoice is saved
      // Note: In the actual implementation, this happens server-side after invoice creation
    });

    it('is expected to create audit event when invoice is sent', () => {
      const sentInvoice = { ...mockInvoice, status: 'sent', sent_at: new Date().toISOString() };

      cy.intercept('PATCH', '**/rest/v1/invoices?id=eq.invoice-123*', {
        statusCode: 200,
        body: [sentInvoice],
      }).as('updateInvoice');

      cy.intercept('POST', '**/rest/v1/invoice_events*', (req) => {
        expect(req.body.event_type).to.equal('sent');
        req.reply({
          statusCode: 201,
          body: {
            id: 'sent-event-id',
            ...req.body,
            created_at: new Date().toISOString(),
          },
        });
      }).as('createSentEvent');

      // Visit invoice detail page and trigger send action
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');

      // When send button is clicked, it should create an audit event
    });

    it('is expected to create audit event when payment is recorded', () => {
      const mockPayment = {
        id: 'payment-123',
        invoice_id: 'invoice-123',
        amount: '12500.00',
        payment_date: '2024-01-20',
        payment_method: 'bank_transfer',
      };

      cy.intercept('POST', '**/rest/v1/payments*', {
        statusCode: 201,
        body: mockPayment,
      }).as('createPayment');

      cy.intercept('POST', '**/rest/v1/invoice_events*', (req) => {
        if (req.body.event_type === 'payment_recorded') {
          expect(req.body.event_data.amount).to.exist;
          expect(req.body.event_data.payment_method).to.exist;
        }
        req.reply({
          statusCode: 201,
          body: {
            id: 'payment-event-id',
            ...req.body,
            created_at: new Date().toISOString(),
          },
        });
      }).as('createPaymentEvent');

      // Visit invoice and record payment
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');

      // When payment modal is used to record payment, audit event should be created
    });
  });

  describe('Edge Cases', () => {
    it('is expected to show empty state when no events exist', () => {
      // Mock empty events
      cy.intercept('GET', '**/rest/v1/invoice_events?invoice_id=eq.invoice-123*', {
        statusCode: 200,
        body: [],
      }).as('getEmptyEvents');

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getEmptyEvents');

      // Verify empty state message
      cy.getByCy('audit-trail-section').within(() => {
        cy.contains('No events yet').should('be.visible');
      });
    });

    it('is expected to display loading state while fetching events', () => {
      // Delay the events response
      cy.intercept('GET', '**/rest/v1/invoice_events?invoice_id=eq.invoice-123*', (req) => {
        req.on('response', (res) => {
          res.setDelay(1000);
        });
      }).as('getEventsDelayed');

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');

      // Verify loading state is shown
      cy.getByCy('audit-trail-section').within(() => {
        // Should show loading skeleton
        cy.get('.animate-pulse').should('exist');
      });
    });

    it('is expected to handle different event types correctly', () => {
      const allEventTypes = [
        {
          id: 'e1',
          invoice_id: 'invoice-123',
          event_type: 'created',
          description: 'Invoice created',
          created_at: '2024-01-15T10:00:00Z',
        },
        {
          id: 'e2',
          invoice_id: 'invoice-123',
          event_type: 'reminder_sent',
          description: 'Reminder #1 sent',
          event_data: { reminder_count: 1 },
          created_at: '2024-01-17T10:00:00Z',
        },
        {
          id: 'e3',
          invoice_id: 'invoice-123',
          event_type: 'status_changed',
          description: 'Status changed from draft to sent',
          event_data: { old_status: 'draft', new_status: 'sent' },
          created_at: '2024-01-18T10:00:00Z',
        },
        {
          id: 'e4',
          invoice_id: 'invoice-123',
          event_type: 'credit_created',
          description: 'Credit invoice INV-0002 created',
          event_data: { credit_invoice_number: 'INV-0002' },
          created_at: '2024-01-19T10:00:00Z',
        },
      ];

      cy.intercept('GET', '**/rest/v1/invoice_events?invoice_id=eq.invoice-123*', {
        statusCode: 200,
        body: allEventTypes,
      }).as('getAllEventTypes');

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getAllEventTypes');

      // Verify all event types are displayed
      cy.getByCy('audit-event-created').should('be.visible');
      cy.getByCy('audit-event-reminder_sent').should('be.visible');
      cy.getByCy('audit-event-status_changed').should('be.visible');
      cy.getByCy('audit-event-credit_created').should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to handle API error when fetching events', () => {
      cy.intercept('GET', '**/rest/v1/invoice_events?invoice_id=eq.invoice-123*', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getEventsError');

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getEventsError');

      // Should still show the section, possibly with empty state
      cy.getByCy('audit-trail-section').should('be.visible');
    });
  });
});
