/**
 * Cypress E2E Tests: Payment Recording (US-020)
 * Tests payment recording functionality including full payments,
 * partial payments, payment history, and validation
 */

describe('Payment Recording (US-020)', () => {
  const mockClient = {
    id: 'client-123',
    name: 'Payment Test Client',
    email: 'payment@test.com'
  };

  const mockInvoice = {
    id: 'invoice-123',
    invoice_number: 'INV-2026-001',
    client_id: 'client-123',
    client: mockClient,
    issue_date: '2026-01-15',
    due_date: '2026-02-15',
    status: 'sent',  // Must be sent, not paid
    currency: 'SEK',
    total_amount: '1000.00',
    subtotal: '800.00',
    vat_amount: '200.00',
    invoice_rows: [],  // Add empty invoice_rows
    invoice_template: null  // Add empty template
  };

  let payments = [];

  beforeEach(() => {
    payments = [];

    // Log all Supabase requests to see what's being called
    cy.intercept('**/rest/v1/**', (req) => {
      cy.log(`API Call: ${req.method} ${req.url}`);
      req.continue();
    });

    // Mock clients
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: [mockClient]
    }).as('getClients');

    // Mock invoices list
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: [mockInvoice]
    }).as('getInvoices');

    // Mock single invoice fetch - Supabase .single() returns object directly, not array
    cy.intercept('GET', `**/rest/v1/invoices*id=eq.${mockInvoice.id}*`, {
      statusCode: 200,
      body: mockInvoice, // Return object directly, not array
      headers: {
        'content-type': 'application/json'
      }
    }).as('getInvoice');

    // Mock payments list
    cy.intercept('GET', `**/rest/v1/payments*invoice_id=eq.${mockInvoice.id}*`, (req) => {
      req.reply({
        statusCode: 200,
        body: payments
      });
    }).as('getPayments');

    // Mock create payment
    cy.intercept('POST', '**/rest/v1/payments*', (req) => {
      const payment = {
        id: `payment-${Date.now()}`,
        ...req.body,
        created_at: new Date().toISOString()
      };
      payments.push(payment);
      req.reply({
        statusCode: 201,
        body: [payment]
      });
    }).as('createPayment');

    // Mock invoice update (for status changes)
    cy.intercept('PATCH', `**/rest/v1/invoices*id=eq.${mockInvoice.id}*`, (req) => {
      const updated = { ...mockInvoice, ...req.body };
      req.reply({
        statusCode: 200,
        body: [updated]
      });
    }).as('updateInvoice');

    cy.login('admin');
  });

  describe('US-020-A: Single Payment Recording', () => {
    it.only('should display Record Payment button on invoice detail page', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      
      // Wait for intercepts to be called
      cy.wait('@getInvoice', { timeout: 10000 });
      cy.wait('@getPayments', { timeout: 10000 });
      
      // Debug what we see
      cy.get('body').invoke('text').then(text => {
        cy.log('Page text:', text.substring(0, 200));
      });
      
      cy.screenshot('after-api-calls');
      
      // Check if invoice number is displayed (means page loaded)
      cy.contains(mockInvoice.invoice_number).should('be.visible');
      
      cy.get('[data-cy=record-payment-btn]').should('be.visible');
    });

    it('should open payment modal when Record Payment is clicked', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should pre-fill payment amount with remaining balance', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-amount]').should('have.value', '1000.00');
    });

    it('should record a full payment successfully', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-method]').select('swish');
      cy.get('[data-cy=payment-reference]').type('SWISH-12345');
      cy.get('[data-cy=payment-notes]').type('Full payment via Swish');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait('@createPayment');
      
      // Modal should close
      cy.get('[data-cy=payment-modal]').should('not.exist');
      
      // Should show payment history
      cy.get('[data-cy=payment-history-table]').should('be.visible');
      cy.get('[data-cy=payment-row]').should('have.length', 1);
      
      // Check payment details
      cy.get('[data-cy=payment-row]').first().within(() => {
        cy.contains('1000.00 SEK').should('be.visible');
        cy.contains('Swish').should('be.visible');
        cy.contains('SWISH-12345').should('be.visible');
      });
    });
  });

  describe('US-020-B: Partial Payment Support', () => {
    const partialInvoice = {
      ...mockInvoice,
      id: 'invoice-456',
      invoice_number: 'INV-2026-002',
      total_amount: '5000.00'
    };

    beforeEach(() => {
      cy.intercept('GET', `**/rest/v1/invoices*id=eq.${partialInvoice.id}*`, {
        statusCode: 200,
        body: [partialInvoice]
      }).as('getPartialInvoice');

      cy.intercept('GET', `**/rest/v1/payments*invoice_id=eq.${partialInvoice.id}*`, (req) => {
        req.reply({
          statusCode: 200,
          body: payments
        });
      }).as('getPartialPayments');
    });

    it('should record first partial payment', () => {
      cy.visit(`/invoices/${partialInvoice.id}`);
      cy.wait('@getPartialInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('2000.00');
      cy.get('[data-cy=payment-method]').select('bank_transfer');
      cy.get('[data-cy=payment-reference]').type('BANK-001');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait('@createPayment');
      
      // Should show partially paid indicator
      cy.contains('Partially Paid').should('be.visible');
    });

    it('should record second partial payment', () => {
      payments = [{
        id: 'payment-1',
        invoice_id: partialInvoice.id,
        amount: '2000.00',
        payment_method: 'bank_transfer',
        payment_date: '2026-01-23',
        reference: 'BANK-001'
      }];

      cy.visit(`/invoices/${partialInvoice.id}`);
      cy.wait('@getPartialInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-amount]').clear().type('1500.00');
      cy.get('[data-cy=payment-method]').select('card');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait('@createPayment');
      
      cy.get('[data-cy=payment-row]').should('have.length', 2);
    });
  });

  describe('US-020-C: Payment History', () => {
    it('should display all payments in payment history table', () => {
      payments = [
        {
          id: 'payment-1',
          invoice_id: mockInvoice.id,
          amount: '400.00',
          payment_method: 'bank_transfer',
          payment_date: '2026-01-20',
          reference: 'BANK-001',
          notes: 'First payment'
        },
        {
          id: 'payment-2',
          invoice_id: mockInvoice.id,
          amount: '300.00',
          payment_method: 'card',
          payment_date: '2026-01-21',
          reference: 'CARD-002',
          notes: 'Second payment'
        },
        {
          id: 'payment-3',
          invoice_id: mockInvoice.id,
          amount: '300.00',
          payment_method: 'swish',
          payment_date: '2026-01-22',
          reference: 'SWISH-003',
          notes: null
        }
      ];

      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      cy.wait('@getPayments');
      
      cy.get('[data-cy=payment-history-table]').should('be.visible');
      cy.get('[data-cy=payment-row]').should('have.length', 3);
      
      // Check first payment
      cy.get('[data-cy=payment-row]').eq(0).within(() => {
        cy.contains('400.00 SEK').should('be.visible');
        cy.contains('Bank transfer').should('be.visible');
        cy.contains('BANK-001').should('be.visible');
      });
      
      // Check second payment
      cy.get('[data-cy=payment-row]').eq(1).within(() => {
        cy.contains('300.00 SEK').should('be.visible');
        cy.contains('Card').should('be.visible');
        cy.contains('CARD-002').should('be.visible');
      });
    });
  });

  describe('US-020-D: Validation', () => {
    it('should prevent payment exceeding remaining balance', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait(2000);
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('1500.00');
      cy.get('[data-cy=save-payment]').click();
      
      // Should show error
      cy.get('[data-cy=payment-error]').should('be.visible');
      cy.contains('exceeds').should('be.visible');
      
      // Modal should stay open
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should prevent negative payment amounts', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('-100');
      cy.get('[data-cy=save-payment]').click();
      
      cy.get('[data-cy=payment-error]').should('be.visible');
    });

    it('should cancel payment recording', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=cancel-payment]').click();
      
      cy.get('[data-cy=payment-modal]').should('not.exist');
    });

    it('should close modal when clicking close button', () => {
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoice');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=close-payment-modal]').click();
      
      cy.get('[data-cy=payment-modal]').should('not.exist');
    });
  });
});
