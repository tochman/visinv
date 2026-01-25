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

    // Login first to establish session
    cy.login('admin');

    // Set up common intercepts with invoice data
    cy.setupCommonIntercepts({
      clients: [mockClient],
      invoices: null  // Use custom intercept below for dynamic response
    });

    // Use custom intercept for dynamic invoice list
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
  });

  describe('Visual Overdue Indicators', () => {
    beforeEach(() => {
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
    });

    it('should highlight overdue invoices in red', () => {
      // Already navigated to invoices in beforeEach
      
      // All overdue invoices should be highlighted with bg-red-50
      cy.contains(overdueInvoice.invoice_number)
        .parents('tr')
        .should('have.class', 'bg-red-50')
        .and('have.class', 'border-l-4')
        .and('have.class', 'border-red-500');
      
      // Very overdue should also be bg-red-50 (same styling)
      cy.contains(veryOverdueInvoice.invoice_number)
        .parents('tr')
        .should('have.class', 'bg-red-50')
        .and('have.class', 'border-l-4')
        .and('have.class', 'border-red-500');
    });

    it('should display days overdue for overdue invoices', () => {
      // Already navigated in beforeEach
      
      // Check for overdue indicator with data-cy attribute
      cy.getByCy(`overdue-indicator-${overdueInvoice.id}`)
        .should('be.visible')
        .and('contain.text', '15'); // days count
      
      cy.getByCy(`overdue-indicator-${veryOverdueInvoice.id}`)
        .should('be.visible')
        .and('contain.text', '45'); // days count
    });

    it('should not highlight non-overdue invoices', () => {
      // Already navigated in beforeEach
      
      cy.contains(notDueInvoice.invoice_number)
        .parents('tr')
        .should('not.have.class', 'bg-red-50')
        .should('not.have.class', 'bg-red-100');
    });
  });

  describe('Reminder Button and Actions', () => {
    beforeEach(() => {
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
    });

    it('should display send reminder button for overdue invoices', () => {
      // Already navigated in beforeEach
      
      cy.getByCy(`send-reminder-button-${overdueInvoice.id}`)
        .scrollIntoView()
        .should('be.visible');
    });

    it('should not display send reminder button for non-overdue invoices', () => {
      // Already navigated in beforeEach
      
      cy.getByCy(`send-reminder-button-${notDueInvoice.id}`).should('not.exist');
    });

    it('should send reminder and update reminder count', () => {
      // Already navigated in beforeEach
      
      cy.getByCy(`send-reminder-button-${overdueInvoice.id}`).click();
      
      cy.wait('@updateInvoice');
      
      // Should show reminder badge with count
      cy.getByCy(`reminder-badge-${overdueInvoice.id}`)
        .should('be.visible')
        .and('contain', '1');
    });

    it('should increment reminder count on subsequent reminders', () => {
      // Start with reminder count of 1
      overdueInvoice.reminder_count = 1;
      overdueInvoice.reminder_sent_at = new Date().toISOString();
      
      // Reload data with updated invoice
      cy.reload();
      cy.wait('@getInvoices');
      
      // Verify initial count is 1
      cy.getByCy(`reminder-badge-${overdueInvoice.id}`)
        .should('contain', '1');
      
      // Set up intercepts BEFORE clicking to ensure they catch the requests
      const updatedInvoice = { ...overdueInvoice, reminder_count: 2, reminder_sent_at: new Date().toISOString() };
      
      cy.intercept('PATCH', `**/rest/v1/invoices?id=eq.${overdueInvoice.id}*`, {
        statusCode: 200,
        body: [updatedInvoice]
      }).as('updateInvoice2');
      
      // Mock the refresh GET - this will be called by fetchInvoices()
      cy.intercept('GET', '**/rest/v1/invoices?*', {
        statusCode: 200,
        body: [updatedInvoice, veryOverdueInvoice, notDueInvoice]
      }).as('getInvoicesRefresh');
      
      // Set up alert stub before clicking
      cy.window().then((win) => {
        cy.stub(win, 'alert').as('alertStub');
      });
      
      // Send second reminder
      cy.getByCy(`send-reminder-button-${overdueInvoice.id}`)
        .scrollIntoView()
        .click();
      
      cy.wait('@updateInvoice2');
      cy.wait('@getInvoicesRefresh');
      
      // Wait for alert to be called
      cy.get('@alertStub').should('have.been.called');
      
      // Should now show count of 2
      cy.getByCy(`reminder-badge-${overdueInvoice.id}`)
        .should('contain', '2');
    });
  });

  describe('Reminder Badge Display', () => {
    beforeEach(() => {
      cy.getByCy('sidebar-nav-invoices').click();
      cy.wait('@getInvoices');
    });

    it('should display reminder badge after sending reminder', () => {
      veryOverdueInvoice.reminder_count = 1;
      veryOverdueInvoice.reminder_sent_at = new Date().toISOString();
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.getByCy(`reminder-badge-${veryOverdueInvoice.id}`)
        .should('be.visible')
        .and('have.class', 'bg-purple-100');
    });

    it('should show correct reminder count in badge', () => {
      overdueInvoice.reminder_count = 3;
      overdueInvoice.reminder_sent_at = new Date().toISOString();
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.getByCy(`reminder-badge-${overdueInvoice.id}`)
        .should('contain', '3');
    });

    it('should not show reminder badge on invoices without reminders sent', () => {
      notDueInvoice.reminder_count = 0;
      notDueInvoice.reminder_sent_at = null;
      
      cy.visit('/invoices');
      cy.wait('@getInvoices');
      
      cy.getByCy(`reminder-badge-${notDueInvoice.id}`).should('not.exist');
    });
  });
});
