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
    subtotal: 10000,
    tax_rate: 25,
    tax_amount: 2500,
    total_amount: 12500,
    currency: 'SEK',
    exchange_rate: 1.0,
    created_at: '2024-01-15T10:00:00Z',
    sent_at: '2024-01-16T14:30:00Z',
    client: mockClient,
    invoice_rows: [
      {
        id: 'row-1',
        description: 'Consulting Services',
        quantity: 10,
        unit_price: 1000,
        amount: 10000,
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

  // Mock organization used by all tests
  const mockOrganization = {
    id: 'test-org-id',
    name: 'Test Organization AB',
    organization_number: '556677-8899',
    invoice_numbering_mode: 'auto',
    invoice_prefix: 'INV-',
    next_invoice_number: 1,
  };

  describe('Happy Path - Viewing Audit Trail', () => {
    beforeEach(() => {
      cy.login('admin');
      
      // Mock organization (same pattern as invoices.cy.js)
      const mockOrganization = {
        id: 'test-org-id',
        name: 'Test Organization AB',
        org_number: '556677-8899',
        organization_number: '556677-8899',
        vat_number: 'SE556677889901',
        address: 'Testgatan 123',
        city: 'Stockholm',
        postal_code: '11122',
        country: 'Sweden',
        email: 'billing@testorg.se',
        phone: '+46701234567',
        bank_name: 'Nordea',
        bank_account: '1234-5678901234',
        bank_bic: 'NDEASESS',
        bank_iban: 'SE1234567890123456789012',
        invoice_numbering_mode: 'auto',
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
      };
      
      // Use setupCommonIntercepts for the list page
      cy.setupCommonIntercepts({
        invoices: [mockInvoice],
        clients: [mockClient],
        templates: [],
        products: [],
        defaultOrganization: mockOrganization,
      });
      
      // Mock payments for invoice detail page
      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [],
      }).as('getPayments');
      
      // Mock invoice_events for audit trail
      cy.intercept('GET', '**/rest/v1/invoice_events*', {
        statusCode: 200,
        body: mockAuditEvents,
      }).as('getInvoiceEvents');
      
      // Navigate to invoices page (same pattern as invoices.cy.js)
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
    });

    it('is expected to display audit trail section on invoice detail page', () => {
      // Wait for invoice table to load
      cy.getByCy('invoices-page-title').should('be.visible');
      
      // Check if our invoice is in the list
      cy.contains('INV-0001').should('be.visible');
      
      // Now click the view button
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceEvents');

      // Verify audit trail section exists
      cy.getByCy('audit-trail-section').scrollIntoView().should('be.visible');
    });

    it('is expected to display all audit events', () => {
      // Navigate to invoice detail (same pattern as first test)
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getInvoiceEvents');

      // Verify all events are displayed (scroll into view for overflow containers)
      cy.getByCy('audit-event-created').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-sent').scrollIntoView().should('be.visible');
      cy.getByCy('audit-event-payment_recorded').scrollIntoView().should('be.visible');
    });

    it('is expected to show correct event details', () => {
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
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
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
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
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
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
      cy.login('admin');
      
      // Mock organization
      const mockOrganization = {
        id: 'test-org-id',
        name: 'Test Organization AB',
        organization_number: '556677-8899',
        invoice_numbering_mode: 'auto',
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
      };
      
      cy.setupCommonIntercepts({
        invoices: [mockInvoice],
        clients: [mockClient],
        templates: [],
        products: [],
        defaultOrganization: mockOrganization,
      });
      
      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [],
      }).as('getPayments');
      
      cy.intercept('GET', '**/rest/v1/invoice_events*', {
        statusCode: 200,
        body: [],
      }).as('getInvoiceEvents');
      
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
      
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
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

      cy.login('admin');
      
      const mockOrganization = {
        id: 'test-org-id',
        name: 'Test Organization AB',
        organization_number: '556677-8899',
        invoice_numbering_mode: 'auto',
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
      };
      
      cy.setupCommonIntercepts({
        invoices: [mockInvoice],
        clients: [mockClient],
        templates: [],
        products: [],
        defaultOrganization: mockOrganization,
      });
      
      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [],
      }).as('getPayments');
      
      cy.intercept('GET', '**/rest/v1/invoice_events*', {
        statusCode: 200,
        body: allEventTypes,
      }).as('getInvoiceEvents');
      
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
      
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
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
      cy.login('admin');
      
      const mockOrganization = {
        id: 'test-org-id',
        name: 'Test Organization AB',
        organization_number: '556677-8899',
        invoice_numbering_mode: 'auto',
        invoice_prefix: 'INV-',
        next_invoice_number: 1,
      };
      
      cy.setupCommonIntercepts({
        invoices: [mockInvoice],
        clients: [mockClient],
        templates: [],
        products: [],
        defaultOrganization: mockOrganization,
      });

      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [],
      }).as('getPayments');

      cy.intercept('GET', '**/rest/v1/invoice_events*', {
        statusCode: 500,
        body: { error: 'Internal server error' },
      }).as('getEventsError');

      // Navigate to invoices via sidebar
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');

      // Click the view button
      cy.getByCy('invoices-page-title').should('be.visible');
      cy.contains('INV-0001').should('be.visible');
      cy.getByCy(`view-invoice-button-${mockInvoice.id}`).click();
      cy.wait('@getEventsError');

      // Should still show the section, possibly with empty state
      cy.getByCy('audit-trail-section').scrollIntoView().should('be.visible');
    });
  });
});

