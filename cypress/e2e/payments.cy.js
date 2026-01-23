/**
 * Cypress E2E Tests: Payment Recording (US-020)
 * Tests payment recording functionality including full payments,
 * partial payments, payment history, and validation
 */

describe('Payment Recording (US-020)', () => {
  let testOrg;
  let testClient;
  let testInvoice;

  before(() => {
    // Login and setup test data
    cy.visit('/');
    cy.get('[data-cy=email]').type('test@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=signin-button]').click();
    cy.url().should('include', '/dashboard');

    // Create organization
    cy.visit('/settings');
    cy.get('[data-cy=org-name]').clear().type('Payment Test Org');
    cy.get('[data-cy=save-org]').click();
    cy.wait(1000);

    // Create a test client
    cy.visit('/clients');
    cy.get('[data-cy=add-client]').click();
    cy.get('[data-cy=client-name]').type('Test Payment Client');
    cy.get('[data-cy=client-email]').type('payment@test.com');
    cy.get('[data-cy=save-client]').click();
    cy.wait(1000);

    // Create an invoice
    cy.visit('/invoices');
    cy.get('[data-cy=create-invoice]').click();
    
    // Fill invoice form
    cy.get('[data-cy=invoice-client]').select('Test Payment Client');
    cy.get('[data-cy=invoice-issue-date]').type('2026-01-15');
    cy.get('[data-cy=invoice-due-date]').type('2026-02-15');
    cy.get('[data-cy=invoice-currency]').select('SEK');
    
    // Add line item
    cy.get('[data-cy=add-line-item]').click();
    cy.get('[data-cy=line-item-description-0]').type('Test Service');
    cy.get('[data-cy=line-item-quantity-0]').clear().type('1');
    cy.get('[data-cy=line-item-unit-price-0]').clear().type('1000.00');
    
    cy.get('[data-cy=save-invoice]').click();
    cy.wait(1000);
  });

  describe('US-020-A: Single Payment Recording', () => {
    it('should display Record Payment button on unpaid invoice', () => {
      cy.visit('/invoices');
      cy.contains('Test Payment Client').parents('tr').within(() => {
        cy.get('[data-cy=view-invoice]').click();
      });
      
      cy.get('[data-cy=record-payment-btn]').should('be.visible');
    });

    it('should open payment modal when Record Payment is clicked', () => {
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should pre-fill payment amount with remaining balance', () => {
      cy.get('[data-cy=payment-amount]').should('have.value', '1000.00');
    });

    it('should record a full payment successfully', () => {
      cy.get('[data-cy=payment-date]').should('not.be.empty'); // Default to today
      cy.get('[data-cy=payment-method]').select('swish');
      cy.get('[data-cy=payment-reference]').type('SWISH-12345');
      cy.get('[data-cy=payment-notes]').type('Full payment via Swish');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait(1000);
      
      // Modal should close
      cy.get('[data-cy=payment-modal]').should('not.exist');
      
      // Should show payment history
      cy.get('[data-cy=payment-history-table]').should('be.visible');
      cy.get('[data-cy=payment-row]').should('have.length', 1);
      
      // Check payment details
      cy.get('[data-cy=payment-row]').first().within(() => {
        cy.contains('1000.00 SEK').should('be.visible');
        cy.contains('swish').should('be.visible');
        cy.contains('SWISH-12345').should('be.visible');
        cy.contains('Full payment via Swish').should('be.visible');
      });
      
      // Remaining balance should be 0
      cy.contains('0.00 SEK').should('be.visible');
      
      // Record Payment button should not be visible
      cy.get('[data-cy=record-payment-btn]').should('not.exist');
    });
  });

  describe('US-020-B: Partial Payment Support', () => {
    before(() => {
      // Create a new invoice for partial payment testing
      cy.visit('/invoices');
      cy.get('[data-cy=create-invoice]').click();
      
      cy.get('[data-cy=invoice-client]').select('Test Payment Client');
      cy.get('[data-cy=invoice-issue-date]').type('2026-01-16');
      cy.get('[data-cy=invoice-due-date]').type('2026-02-16');
      cy.get('[data-cy=invoice-currency]').select('SEK');
      
      cy.get('[data-cy=add-line-item]').click();
      cy.get('[data-cy=line-item-description-0]').type('Partial Payment Test');
      cy.get('[data-cy=line-item-quantity-0]').clear().type('1');
      cy.get('[data-cy=line-item-unit-price-0]').clear().type('5000.00');
      
      cy.get('[data-cy=save-invoice]').click();
      cy.wait(1000);
      
      // Navigate to the new invoice
      cy.visit('/invoices');
      cy.contains('Partial Payment Test').parents('tr').within(() => {
        cy.get('[data-cy=view-invoice]').click();
      });
    });

    it('should record first partial payment', () => {
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('2000.00');
      cy.get('[data-cy=payment-method]').select('bank_transfer');
      cy.get('[data-cy=payment-reference]').type('BANK-001');
      cy.get('[data-cy=payment-notes]').type('First partial payment');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait(1000);
      
      // Check remaining balance
      cy.contains('3000.00 SEK').should('be.visible');
      
      // Should show partially paid indicator
      cy.contains('Partially Paid').should('be.visible');
    });

    it('should record second partial payment', () => {
      cy.get('[data-cy=record-payment-btn]').click();
      
      // Amount should be pre-filled with remaining balance
      cy.get('[data-cy=payment-amount]').should('have.value', '3000.00');
      
      cy.get('[data-cy=payment-amount]').clear().type('1500.00');
      cy.get('[data-cy=payment-method]').select('card');
      cy.get('[data-cy=payment-reference]').type('CARD-002');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait(1000);
      
      // Check remaining balance
      cy.contains('1500.00 SEK').should('be.visible');
      
      // Should still show partially paid
      cy.contains('Partially Paid').should('be.visible');
    });

    it('should complete payment with final partial payment', () => {
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').should('have.value', '1500.00');
      cy.get('[data-cy=payment-method]').select('swish');
      
      cy.get('[data-cy=save-payment]').click();
      cy.wait(1000);
      
      // Remaining balance should be 0
      cy.contains('0.00 SEK').should('be.visible');
      
      // Record Payment button should be hidden
      cy.get('[data-cy=record-payment-btn]').should('not.exist');
    });
  });

  describe('US-020-C: Payment History', () => {
    it('should display all payments in chronological order', () => {
      cy.visit('/invoices');
      cy.contains('Partial Payment Test').parents('tr').within(() => {
        cy.get('[data-cy=view-invoice]').click();
      });
      
      cy.get('[data-cy=payment-history-table]').should('be.visible');
      cy.get('[data-cy=payment-row]').should('have.length', 3);
      
      // Check first payment
      cy.get('[data-cy=payment-row]').eq(0).within(() => {
        cy.contains('2000.00 SEK').should('be.visible');
        cy.contains('bank_transfer').should('be.visible');
        cy.contains('BANK-001').should('be.visible');
      });
      
      // Check second payment
      cy.get('[data-cy=payment-row]').eq(1).within(() => {
        cy.contains('1500.00 SEK').should('be.visible');
        cy.contains('card').should('be.visible');
        cy.contains('CARD-002').should('be.visible');
      });
      
      // Check third payment
      cy.get('[data-cy=payment-row]').eq(2).within(() => {
        cy.contains('1500.00 SEK').should('be.visible');
        cy.contains('swish').should('be.visible');
      });
    });
  });

  describe('US-020-D: Validation', () => {
    before(() => {
      // Create another invoice for validation testing
      cy.visit('/invoices');
      cy.get('[data-cy=create-invoice]').click();
      
      cy.get('[data-cy=invoice-client]').select('Test Payment Client');
      cy.get('[data-cy=invoice-issue-date]').type('2026-01-17');
      cy.get('[data-cy=invoice-due-date]').type('2026-02-17');
      cy.get('[data-cy=invoice-currency]').select('SEK');
      
      cy.get('[data-cy=add-line-item]').click();
      cy.get('[data-cy=line-item-description-0]').type('Validation Test');
      cy.get('[data-cy=line-item-quantity-0]').clear().type('1');
      cy.get('[data-cy=line-item-unit-price-0]').clear().type('1000.00');
      
      cy.get('[data-cy=save-invoice]').click();
      cy.wait(1000);
      
      cy.visit('/invoices');
      cy.contains('Validation Test').parents('tr').within(() => {
        cy.get('[data-cy=view-invoice]').click();
      });
    });

    it('should prevent payment exceeding remaining balance', () => {
      cy.get('[data-cy=record-payment-btn]').click();
      
      cy.get('[data-cy=payment-amount]').clear().type('1500.00');
      cy.get('[data-cy=save-payment]').click();
      
      // Should show error
      cy.get('[data-cy=payment-error]').should('be.visible');
      cy.contains('exceeds').should('be.visible');
      
      // Modal should stay open
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should prevent negative or zero payment amounts', () => {
      cy.get('[data-cy=payment-amount]').clear().type('0');
      cy.get('[data-cy=save-payment]').click();
      
      cy.get('[data-cy=payment-error]').should('be.visible');
      
      cy.get('[data-cy=payment-amount]').clear().type('-100');
      cy.get('[data-cy=save-payment]').click();
      
      cy.get('[data-cy=payment-error]').should('be.visible');
    });

    it('should require payment date', () => {
      cy.get('[data-cy=payment-amount]').clear().type('500.00');
      cy.get('[data-cy=payment-date]').clear();
      
      cy.get('[data-cy=save-payment]').click();
      
      // HTML5 validation should prevent submission
      cy.get('[data-cy=payment-modal]').should('be.visible');
    });

    it('should cancel payment recording', () => {
      cy.get('[data-cy=cancel-payment]').click();
      
      cy.get('[data-cy=payment-modal]').should('not.exist');
    });
  });

  after(() => {
    // Cleanup test data
    cy.log('Test completed - cleanup would happen here in production');
  });
});
