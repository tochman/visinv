/**
 * Cypress E2E Tests: Payment Recording (US-020)
 * Tests payment recording functionality including full payments,
 * partial payments, payment history, and validation
 */

describe('Payment Recording (US-020)', () => {
  // Mock data based on real API responses
  const mockClient = {
    id: 'c413f63d-cb63-4e00-98d2-f8ea1f7603d3',
    name: 'ACME Corp',
    email: 'acme@example.com',
    address: '123 Main St',
    city: 'Stockholm',
    postal_code: '111 22',
    country: 'Sweden',
    organization_number: '556123-4567'
  };

  const mockInvoice = {
    id: '24226b6c-cb71-4a61-986b-ba724a5a6b89',
    user_id: 'ebba58bf-5f55-4173-a953-3c0567041bb0',
    team_id: null,
    client_id: 'c413f63d-cb63-4e00-98d2-f8ea1f7603d3',
    invoice_number: 'INV-0001',
    issue_date: '2026-01-21',
    due_date: '2026-02-20',
    status: 'sent',
    currency: 'SEK',
    subtotal: 800.00,
    tax_rate: 25.00,
    tax_amount: 200.00,
    total_amount: 1000.00,
    notes: '',
    terms: '30 dagar netto',
    reference: '',
    sent_at: '2026-01-22T22:55:44.97+00:00',
    paid_at: null,
    created_at: '2026-01-21T18:31:18.138077+00:00',
    updated_at: '2026-01-22T22:55:45.208659+00:00',
    organization_id: null,
    delivery_date: '2026-01-21',
    payment_reference: '001',
    invoice_template_id: '3850a63a-82a7-41c0-b85b-ae51e611a746',
    invoice_type: 'DEBET',
    credited_invoice_id: null,
    reminder_sent_at: null,
    reminder_count: 0,
    client: {
      id: 'c413f63d-cb63-4e00-98d2-f8ea1f7603d3',
      name: 'ACME Corp',
      email: 'acme@example.com'
    },
    invoice_rows: [
      {
        id: 'fa89e541-efe7-4e78-a733-0ba118d43ab1',
        unit: 'st',
        amount: 800.00,
        quantity: 1.00,
        tax_rate: 25.00,
        created_at: '2026-01-21T18:31:18.311005+00:00',
        invoice_id: '24226b6c-cb71-4a61-986b-ba724a5a6b89',
        product_id: '81d4b446-0c46-44db-bfaa-06975108e79a',
        sort_order: 0,
        unit_price: 800.00,
        description: 'Consulting Service'
      }
    ],
    invoice_template: {
      id: '3850a63a-82a7-41c0-b85b-ae51e611a746',
      name: 'Kompakt - Enkel',
      is_system: true
    }
  };

  const mockTemplate = {
    id: '3850a63a-82a7-41c0-b85b-ae51e611a746',
    user_id: null,
    name: 'Kompakt - Enkel',
    content: '<html>...</html>',
    variables: [],
    is_system: true,
    created_at: '2026-01-21T20:41:00.21914+00:00',
    updated_at: '2026-01-21T21:39:31.10673+00:00'
  };

  let payments = [];

  beforeEach(() => {
    payments = [];
    cy.login('admin');
  });

  // Helper to set up intercepts AFTER login
  const setupInvoiceIntercepts = (invoiceOverrides = {}) => {
    const invoice = { ...mockInvoice, ...invoiceOverrides };
    
    // Mock ALL invoice queries - getRemainingBalance also queries invoices
    cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
      req.reply({ statusCode: 200, body: invoice });
    }).as('getInvoices');

    // Mock ALL payment queries - use dynamic response to reflect changes
    cy.intercept('GET', '**/rest/v1/payments*', (req) => {
      req.reply({ statusCode: 200, body: payments });
    }).as('getPayments');

    cy.intercept('POST', '**/rest/v1/payments*', (req) => {
      const payment = {
        id: `payment-${Date.now()}`,
        ...req.body,
        created_at: new Date().toISOString()
      };
      payments.push(payment);
      req.reply({ statusCode: 201, body: payment });
    }).as('createPayment');

    cy.intercept('PATCH', '**/rest/v1/invoices*', (req) => {
      req.reply({ statusCode: 200, body: [{ ...invoice, ...req.body }] });
    }).as('updateInvoice');

    return invoice;
  };

  describe('US-020-A: Single Payment Recording', () => {
    it('should display Record Payment button on invoice detail page', () => {
      setupInvoiceIntercepts();
      
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      // Check if invoice number is displayed (means page loaded)
      cy.contains(mockInvoice.invoice_number).should('be.visible');
      
      // Check Record Payment button is visible for unpaid invoice
      cy.get('[data-cy=record-payment-btn]').should('be.visible');
    });

    it('should open payment modal when Record Payment is clicked', () => {
      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should pre-fill payment amount with remaining balance', () => {
      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-amount]').should('have.value', '1000.00');
    });

    it('should record a full payment successfully', () => {
      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
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
    });
  });

  describe('US-020-B: Partial Payment Support', () => {
    it('should record first partial payment', () => {
      // Use a modified invoice with higher total for partial payment tests
      const partialInvoice = {
        ...mockInvoice,
        id: 'partial-invoice-001',
        invoice_number: 'INV-0002',
        total_amount: 5000.00,
        subtotal: 4000.00,
        tax_amount: 1000.00
      };

      cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
        req.reply({ statusCode: 200, body: partialInvoice });
      }).as('getInvoices');

      // Use dynamic response to reflect payment changes
      cy.intercept('GET', '**/rest/v1/payments*', (req) => {
        req.reply({ statusCode: 200, body: payments });
      }).as('getPayments');

      cy.intercept('POST', '**/rest/v1/payments*', (req) => {
        const payment = {
          id: `payment-${Date.now()}`,
          ...req.body,
          created_at: new Date().toISOString()
        };
        payments.push(payment);
        req.reply({ statusCode: 201, body: payment });
      }).as('createPayment');

      cy.visit('/invoices/partial-invoice-001');
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('2000.00');
      cy.get('[data-cy=payment-method]').select('bank_transfer');
      cy.get('[data-cy=payment-reference]').type('BANK-001');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait('@createPayment');
      
      // Should show remaining balance after partial payment
      cy.get('[data-cy=remaining-balance]').should('contain', '3000');
    });

    it('should show multiple payments in history', () => {
      payments = [
        {
          id: 'payment-1',
          invoice_id: mockInvoice.id,
          amount: 400.00,
          payment_method: 'bank_transfer',
          payment_date: '2026-01-20',
          reference: 'BANK-001',
          created_at: '2026-01-20T10:00:00.000Z'
        },
        {
          id: 'payment-2',
          invoice_id: mockInvoice.id,
          amount: 300.00,
          payment_method: 'swish',
          payment_date: '2026-01-21',
          reference: 'SWISH-002',
          created_at: '2026-01-21T10:00:00.000Z'
        }
      ];

      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=payment-history-table]').should('be.visible');
      cy.get('[data-cy=payment-row]').should('have.length', 2);
    });
  });

  describe('US-020-C: Payment History', () => {
    it('should display all payments in payment history table', () => {
      payments = [
        {
          id: 'payment-1',
          invoice_id: mockInvoice.id,
          amount: 400.00,
          payment_method: 'bank_transfer',
          payment_date: '2026-01-20',
          reference: 'BANK-001',
          notes: 'First payment',
          created_at: '2026-01-20T10:00:00.000Z'
        },
        {
          id: 'payment-2',
          invoice_id: mockInvoice.id,
          amount: 300.00,
          payment_method: 'card',
          payment_date: '2026-01-21',
          reference: 'CARD-002',
          notes: 'Second payment',
          created_at: '2026-01-21T10:00:00.000Z'
        },
        {
          id: 'payment-3',
          invoice_id: mockInvoice.id,
          amount: 300.00,
          payment_method: 'swish',
          payment_date: '2026-01-22',
          reference: 'SWISH-003',
          notes: null,
          created_at: '2026-01-22T10:00:00.000Z'
        }
      ];

      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      cy.wait('@getPayments');
      
      cy.get('[data-cy=payment-history-table]').should('be.visible');
      cy.get('[data-cy=payment-row]').should('have.length', 3);
    });

    it('should show remaining balance when partially paid', () => {
      payments = [
        {
          id: 'payment-1',
          invoice_id: mockInvoice.id,
          amount: 700.00,
          payment_method: 'bank_transfer',
          payment_date: '2026-01-20',
          reference: 'BANK-001',
          created_at: '2026-01-20T10:00:00.000Z'
        }
      ];

      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      // Total is 1000, paid 700, remaining should be 300
      cy.get('[data-cy=remaining-balance]').should('contain', '300');
    });
  });

  describe('US-020-D: Validation', () => {
    it('should prevent payment exceeding remaining balance', () => {
      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('1500.00');
      cy.get('[data-cy=payment-method]').select('swish');
      cy.get('[data-cy=save-payment]').click();
      
      // Should show error (overpayment validation)
      cy.get('[data-cy=payment-error]').should('be.visible');
      
      // Modal should stay open
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should require payment method selection', () => {
      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=record-payment-btn]').click();
      
      // Try to save without selecting payment method
      cy.get('[data-cy=save-payment]').click();
      
      // Should show validation error or stay in modal
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should cancel payment recording', () => {
      setupInvoiceIntercepts();
      cy.visit(`/invoices/${mockInvoice.id}`);
      cy.wait('@getInvoices');
      
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=cancel-payment]').click();
      
      cy.get('[data-cy=payment-modal]').should('not.exist');
    });

    it('should not show Record Payment for paid invoices', () => {
      const paidInvoice = {
        ...mockInvoice,
        id: 'paid-invoice-001',
        status: 'paid',
        paid_at: '2026-01-22T10:00:00.000Z'
      };

      cy.intercept('GET', '**/rest/v1/invoices*', (req) => {
        req.reply({ statusCode: 200, body: paidInvoice });
      }).as('getInvoices');

      cy.intercept('GET', '**/rest/v1/payments*', {
        statusCode: 200,
        body: [{ id: 'payment-1', invoice_id: 'paid-invoice-001', amount: 1000.00 }]
      }).as('getPayments');

      cy.visit('/invoices/paid-invoice-001');
      cy.wait('@getInvoices');
      
      // Record Payment button should not exist for paid invoices
      cy.get('[data-cy=record-payment-btn]').should('not.exist');
    });
  });
});
