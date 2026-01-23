/**
 * Cypress E2E Tests: Overdue Invoice Alerts (US-026-A)
 * Tests overdue invoice detection, visual indicators, reminder tracking,
 * and reminder sending functionality
 */

describe('Overdue Invoice Alerts (US-026-A)', () => {
  const mockClient = {
    id: 'client-123',
    name: 'Overdue Test Client',
    email: 'overdue@test.com'
  };

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  const fortyFiveDaysAgo = new Date();
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
  
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  const overdueInvoice = {
    id: 'invoice-overdue-15',
    invoice_number: 'INV-2026-001',
    client_id: mockClient.id,
    client: mockClient,
    issue_date: '2026-01-01',
    due_date: fifteenDaysAgo.toISOString().split('T')[0],
    status: 'sent',
    currency: 'SEK',
    total_amount: '2000.00',
    reminder_count: 0
  };

  const veryOverdueInvoice = {
    id: 'invoice-overdue-45',
    invoice_number: 'INV-2026-002',
    client_id: mockClient.id,
    client: mockClient,
    issue_date: '2025-12-01',
    due_date: fortyFiveDaysAgo.toISOString().split('T')[0],
    status: 'sent',
    currency: 'SEK',
    total_amount: '5000.00',
    reminder_count: 0
  };

  const notDueInvoice = {
    id: 'invoice-not-due',
    invoice_number: 'INV-2026-003',
    client_id: mockClient.id,
    client: mockClient,
    issue_date: '2026-01-20',
    due_date: fiveDaysFromNow.toISOString().split('T')[0],
    status: 'sent',
    currency: 'SEK',
    total_amount: '1000.00',
    reminder_count: 0
  };

  let invoices = [];

  beforeEach(() => {
    invoices = [overdueInvoice, veryOverdueInvoice, notDueInvoice];

    // Mock clients
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: [mockClient]
    }).as('getClients');

    // Mock invoices list
    cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
      req.reply({
        statusCode: 200,
        body: invoices
      });
    }).as('getInvoices');

    // Mock invoice update for reminder tracking
    cy.intercept('PATCH', '**/rest/v1/invoices?id=eq.*', (req) => {
      const invoiceId = req.url.match(/id=eq\.([^&]+)/)[1];
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (invoice && req.body.reminder_count !== undefined) {
        invoice.reminder_count = req.body.reminder_count;
        invoice.reminder_sent_at = new Date().toISOString();
      }
      req.reply({
        statusCode: 200,
        body: [{ ...invoice, ...req.body }]
      });
    }).as('updateInvoice');

    // Mock empty payments
    cy.intercept('GET', '**/rest/v1/payments*', {
      statusCode: 200,
      body: []
    }).as('getPayments');

    cy.login('admin');
  });

  describe('Visual Overdue Indicators', () => {
    it('should highlight overdue invoices in red', () => {
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      // 15 days overdue should be highlighted
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .should('have.class', 'bg-red-50');
      
      // 45 days overdue should be highlighted darker
      cy.contains(veryOverdueInvoice.invoice_number)
        .parents('tr')
        .should('have.class', 'bg-red-100');
    });

    it('should display days overdue for overdue invoices', () => {
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .should('contain', 'days overdue');
      
      cy.contains(veryOverdueInvoice.invoice_number)
        .parents('tr')
        .should('contain', 'days overdue');
    });

    it('should not highlight non-overdue invoices', () => {
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(notDueInvoice.invoice_number)
        .parents('tr')
        .should('not.have.class', 'bg-red-50')
        .should('not.have.class', 'bg-red-100');
    });
  });

  describe('Reminder Button and Actions', () => {
    it('should display send reminder button for overdue invoices', () => {
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=send-reminder]').should('be.visible');
        });
    });

    it('should not display send reminder button for non-overdue invoices', () => {
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(notDueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=send-reminder]').should('not.exist');
        });
    });

    it('should send reminder and update reminder count', () => {
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=send-reminder]').click();
        });
      
      cy.wait('@updateInvoice');
      
      // Should show reminder badge with count
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=reminder-badge]').should('be.visible');
          cy.get('[data-cy=reminder-badge]').should('contain', '1');
        });
    });

    it('should increment reminder count on subsequent reminders', () => {
      overdueInvoice.reminder_count = 1;
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      // Send second reminder
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=send-reminder]').click();
        });
      
      cy.wait('@updateInvoice');
      
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=reminder-badge]').should('contain', '2');
        });
    });
  });

  describe('Reminder Badge Display', () => {
    it('should display reminder badge after sending reminder', () => {
      veryOverdueInvoice.reminder_count = 1;
      veryOverdueInvoice.reminder_sent_at = new Date().toISOString();
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(veryOverdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=reminder-badge]').should('be.visible');
          cy.get('[data-cy=reminder-badge]').should('have.class', 'bg-purple-100');
        });
    });

    it('should show correct reminder count in badge', () => {
      overdueInvoice.reminder_count = 3;
      overdueInvoice.reminder_sent_at = new Date().toISOString();
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=reminder-badge]').should('contain', '3');
        });
    });

    it('should not show reminder badge on invoices without reminders sent', () => {
      notDueInvoice.reminder_count = 0;
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.contains(notDueInvoice.invoice_number)
        .parents('tr')
        .within(() => {
          cy.get('[data-cy=reminder-badge]').should('not.exist');
        });
    });
  });
});
