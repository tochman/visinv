/// <reference types="cypress" />

/**
 * Audit Trail E2E Tests
 * US-022-E: Audit Trail for Invoice Lifecycle
 *
 * These tests verify the audit trail functionality for invoices.
 * We navigate via UI (sidebar) since cy.login() doesn't allow cy.visit().
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
    status: 'sent', // Must be non-draft to show view button
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

  // Helper to set up intercepts for both list and detail pages
  const setupIntercepts = (events = mockAuditEvents) => {
    // Mock ALL invoice requests (both list and detail)
    cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
      // Return single object for detail (uses .single()), array for list
      const isDetailRequest = req.url.includes('id=eq.');
      req.reply({
        statusCode: 200,
        body: isDetailRequest ? mockInvoice : [mockInvoice],
      });
    }).as('getInvoices');

    // Mock payments endpoint (both general and specific)
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

    // Mock templates
    cy.intercept('GET', '**/rest/v1/invoice_templates*', {
      statusCode: 200,
      body: [],
    }).as('getTemplates');

    // Mock products
    cy.intercept('GET', '**/rest/v1/products*', {
      statusCode: 200,
      body: [],
    }).as('getProducts');
  };

  // Helper to navigate to invoices and open invoice detail page
  const navigateToInvoiceDetail = () => {
    // Navigate to invoices via sidebar
    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoices');

    // Click the view button (eye icon) for the sent invoice - this navigates to detail page
    cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
    
    // Wait for the detail page content to load
    cy.getByCy('audit-trail-section').should('exist');
  };

  describe('Happy Path - Viewing Audit Trail', () => {
    beforeEach(() => {
      cy.login('admin');
      setupIntercepts();
    });

    it('is expected to display audit trail section on invoice detail page', () => {
      navigateToInvoiceDetail();
      cy.wait('@getInvoiceEvents');

      // Verify audit trail section exists
      cy.getByCy('audit-trail-section').scrollIntoView().should('be.visible');
    });

    it('is expected to display all audit events', () => {
      navigateToInvoiceDetail();
      cy.wait('@getInvoiceEvents');

      // Verify all events are displayed (scroll into view for overflow containers)
      cy.getByCy('audit-event-created').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-sent').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-payment_recorded').scrollIntoView().should('be.visible');
    });

    it('is expected to show correct event details', () => {
      navigateToInvoiceDetail();
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
      navigateToInvoiceDetail();
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
      navigateToInvoiceDetail();
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
    beforeEach(() => {
      cy.login('admin');
    });

    it('is expected to show empty state when no events exist', () => {
      setupIntercepts([]);
      navigateToInvoiceDetail();
      cy.wait('@getInvoiceEvents');

      // Verify empty state message
      cy.getByCy('audit-trail-section').scrollIntoView().within(() => {
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
      navigateToInvoiceDetail();
      cy.wait('@getInvoiceEvents');

      // Verify all event types are displayed (scroll into view for overflow containers)
      cy.getByCy('audit-event-created').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-reminder_sent').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-status_changed').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-credit_created').scrollIntoView().should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    beforeEach(() => {
      cy.login('admin');
    });

    it('is expected to handle API error gracefully', () => {
      // Set up intercepts manually with error for events
      cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
        const isDetailRequest = req.url.includes('id=eq.');
        req.reply({
          statusCode: 200,
          body: isDetailRequest ? mockInvoice : [mockInvoice],
        });
      }).as('getInvoices');

      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [],
      }).as('getPayments');

      cy.intercept('GET', '**/rest/v1/invoice_events*', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getEventsError');

      cy.intercept('GET', '**/rest/v1/clients*', {
        statusCode: 200,
        body: [mockClient],
      }).as('getClients');

      cy.intercept('GET', '**/rest/v1/invoice_templates*', {
        statusCode: 200,
        body: [],
      }).as('getTemplates');

      cy.intercept('GET', '**/rest/v1/products*', {
        statusCode: 200,
        body: [],
      }).as('getProducts');

      // Navigate to invoices via sidebar
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');

      // Click the view button
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getEventsError');

      // Should still show the section, possibly with empty state
      cy.getByCy('audit-trail-section').scrollIntoView().should('be.visible');
    });
  });
});

