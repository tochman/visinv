/// <reference types="cypress" />

/**
 * Cypress E2E Tests: Payment Confirmation Emails (US-028)
 * Tests automatic email sending when payments are recorded
 */

describe('Payment Confirmation Emails (US-028)', () => {
  const mockClient = {
    id: 'c1',
    name: 'ACME Corp',
    email: 'client@acme.com',
  };

  const mockOrganization = {
    id: 'org1',
    name: 'My Company AB',
    email: 'invoices@mycompany.se',
  };

  const mockInvoice = {
    id: 'inv1',
    invoice_number: 'INV-2024-001',
    client_id: 'c1',
    organization_id: 'org1',
    total_amount: '1000.00',
    currency: 'SEK',
    status: 'sent',
    client: mockClient,
    organization: mockOrganization,
  };

  const mockPayment = {
    id: 'p1',
    invoice_id: 'inv1',
    amount: '500.00',
    payment_date: '2024-01-20',
    payment_method: 'bank_transfer',
  };

  beforeEach(() => {
    cy.setupCommonIntercepts({
      clients: [mockClient],
      organizations: [mockOrganization],
      invoices: [mockInvoice]
    });
    cy.login('admin');
    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoices');
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to send payment confirmation email when recording payment', () => {
      // Intercept invoice detail GET
      cy.intercept('GET', '**/invoices?id=eq.inv1*', [mockInvoice]).as('getInvoice');
      cy.intercept('GET', '**/payments?invoice_id=eq.inv1*', []).as('getPayments');
      
      cy.intercept('POST', '**/payments', {
        statusCode: 201,
        body: [mockPayment]
      }).as('createPayment');

      cy.intercept('POST', '**/functions/v1/send-invoice-email', (req) => {
        expect(req.body).to.have.property('invoiceId', 'inv1');
        expect(req.body).to.have.property('emailType', 'payment');
        expect(req.body).to.have.property('paymentId');
        req.reply({
          statusCode: 200,
          body: { success: true, messageId: 'msg123', to: 'client@acme.com' }
        });
      }).as('sendEmail');

      // Navigate to invoice detail page
      cy.getByCy('view-invoice-button-inv1').click();
      cy.wait('@getInvoice');
      cy.wait('@getPayments');
      
      // Open payment modal
      cy.getByCy('record-payment-btn').click();

      cy.getByCy('payment-amount').clear().type('500.00');
      cy.getByCy('save-payment').click();

      cy.wait('@createPayment');
      cy.wait('@sendEmail', { timeout: 10000 });

      cy.getByCy('toast-container').within(() => {
        cy.contains('Payment confirmation emailed').should('exist');
      });
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to record payment even if email fails', () => {
      // Intercept invoice detail GET
      cy.intercept('GET', '**/invoices?id=eq.inv1*', [mockInvoice]).as('getInvoice');
      cy.intercept('GET', '**/payments?invoice_id=eq.inv1*', []).as('getPayments');
      
      cy.intercept('POST', '**/payments', {
        statusCode: 201,
        body: [mockPayment]
      }).as('createPayment');

      cy.intercept('POST', '**/functions/v1/send-invoice-email', {
        statusCode: 500,
        body: { error: 'Email service unavailable' }
      }).as('sendEmail');

      // Navigate to invoice detail page
      cy.getByCy('view-invoice-button-inv1').click();
      cy.wait('@getInvoice');
      cy.wait('@getPayments');
      
      // Open payment modal
      cy.getByCy('record-payment-btn').click();

      cy.getByCy('payment-amount').clear().type('500.00');
      cy.getByCy('save-payment').click();

      cy.wait('@createPayment');
      cy.wait('@sendEmail', { timeout: 10000 });

      cy.getByCy('toast-container').within(() => {
        cy.contains('Failed to send payment confirmation email').should('exist');
      });

      cy.getByCy('payment-modal').should('not.exist');
    });
  });
});
