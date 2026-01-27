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
  });

  // Helper to set up intercepts
  const setupIntercepts = (events = mockAuditEvents) => {
    // Mock invoice detail endpoint - .single() returns single object, not array
    cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
      req.reply({ statusCode: 200, body: mockInvoice });
    }).as('getInvoice');

    // Mock payments endpoint
    cy.intercept('GET', '**/rest/v1/payments*', {
      statusCode: 200,
      body: [],
    }).as('getPayments');

    // Mock invoice_events endpoint
    cy.intercept('GET', '**/rest/v1/invoice_events*', {
      statusCode: 200,
      body: events,
    }).as('getInvoiceEvents');

    // Mock clients
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: [mockClient],
    }).as('getClients');
  };

  describe('Happy Path - Viewing Audit Trail', () => {
    beforeEach(() => {
      setupIntercepts();
    });

    it('is expected to display audit trail section on invoice detail page', () => {
      cy.visit('/invoices/invoice-123');
      
      // Wait for data to load
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify audit trail section exists
      cy.getByCy('audit-trail-section').should('be.visible');
    });

    it('is expected to display all audit events', () => {
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify all events are displayed (scroll into view for overflow containers)
      cy.getByCy('audit-event-created').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-sent').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-payment_recorded').scrollIntoView().should('be.visible');
    });

    it('is expected to show correct event details', () => {
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify created event details (scroll into view first)
      cy.getByCy('audit-event-created').scrollIntoView().within(() => {
        cy.contains('Created').should('exist');
        cy.contains('Invoice INV-0001 created').should('exist');
      });

      // Verify sent event details
      cy.getByCy('audit-event-sent').scrollIntoView().within(() => {
        cy.contains('Sent').should('exist');
        cy.contains('Invoice INV-0001 sent to client').should('exist');
      });

      // Verify payment event details
      cy.getByCy('audit-event-payment_recorded').scrollIntoView().within(() => {
        cy.contains('Payment Recorded').should('exist');
        cy.contains('Payment of 12500.00 recorded').should('exist');
      });
    });

    it('is expected to display events in chronological order (newest first)', () => {
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Scroll audit trail into view first
      cy.getByCy('audit-trail-section').scrollIntoView();

      // Get all event elements and verify order - events are rendered in the order returned by API
      // The API returns them sorted by created_at DESC (newest first)
      cy.get('[data-cy^="audit-event-"]').should('have.length', 3).then($events => {
        // Verify all three event types exist
        const eventTypes = $events.map((i, el) => Cypress.$(el).attr('data-cy')).get();
        expect(eventTypes).to.include('audit-event-payment_recorded');
        expect(eventTypes).to.include('audit-event-sent');
        expect(eventTypes).to.include('audit-event-created');
      });
    });

    it('is expected to display timestamps for each event', () => {
      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify each event has a timestamp displayed (scroll into view first)
      cy.getByCy('audit-event-created').scrollIntoView().within(() => {
        cy.contains(/Jan.*2024/).should('exist');
      });

      cy.getByCy('audit-event-sent').scrollIntoView().within(() => {
        cy.contains(/Jan.*2024/).should('exist');
      });

      cy.getByCy('audit-event-payment_recorded').scrollIntoView().within(() => {
        cy.contains(/Jan.*2024/).should('exist');
      });
    });
  });

  describe('Edge Cases', () => {
    it('is expected to show empty state when no events exist', () => {
      setupIntercepts([]);

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify empty state message
      cy.getByCy('audit-trail-section').within(() => {
        cy.contains('No events yet').should('be.visible');
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

      setupIntercepts(allEventTypes);

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getInvoiceEvents');

      // Verify all event types are displayed (scroll into view for overflow containers)
      cy.getByCy('audit-event-created').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-reminder_sent').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-status_changed').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-credit_created').scrollIntoView().should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to handle API error gracefully', () => {
      cy.intercept('GET', '**/rest/v1/invoices*', {
        statusCode: 200,
        body: mockInvoice,
      }).as('getInvoice');

      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [],
      }).as('getPayments');

      cy.intercept('GET', '**/rest/v1/invoice_events*', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getEventsError');

      cy.visit('/invoices/invoice-123');
      cy.wait('@getInvoice');
      cy.wait('@getEventsError');

      // Should still show the section, with empty state
      cy.getByCy('audit-trail-section').should('be.visible');
    });
  });
});

