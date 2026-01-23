/**
 * Cypress E2E Tests: Overdue Invoice Alerts (US-026-A)
 * Tests overdue invoice detection, visual indicators, reminder tracking,
 * and reminder sending functionality
 */

describe('Overdue Invoice Alerts (US-026-A)', () => {
  let testOrg;
  let testClient;
  let overdueInvoice;
  let almostDueInvoice;

  before(() => {
    // Login and setup test data
    cy.visit('/');
    cy.get('[data-cy=email]').type('test@example.com');
    cy.get('[data-cy=password]').type('password123');
    cy.get('[data-cy=signin-button]').click();
    cy.url().should('include', '/dashboard');

    // Create organization
    cy.visit('/settings');
    cy.get('[data-cy=org-name]').clear().type('Overdue Test Org');
    cy.get('[data-cy=save-org]').click();
    cy.wait(1000);

    // Create a test client
    cy.visit('/clients');
    cy.get('[data-cy=add-client]').click();
    cy.get('[data-cy=client-name]').type('Overdue Test Client');
    cy.get('[data-cy=client-email]').type('overdue@test.com');
    cy.get('[data-cy=save-client]').click();
    cy.wait(1000);
  });

  describe('Overdue Invoice Detection', () => {
    it('should create an invoice that is overdue by 15 days', () => {
      cy.visit('/invoices');
      cy.get('[data-cy=create-invoice]').click();
      
      // Calculate dates
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      cy.get('[data-cy=invoice-client]').select('Overdue Test Client');
      cy.get('[data-cy=invoice-issue-date]').type(thirtyDaysAgo.toISOString().split('T')[0]);
      cy.get('[data-cy=invoice-due-date]').type(fifteenDaysAgo.toISOString().split('T')[0]);
      cy.get('[data-cy=invoice-currency]').select('SEK');
      
      cy.get('[data-cy=add-line-item]').click();
      cy.get('[data-cy=line-item-description-0]').type('Overdue Service');
      cy.get('[data-cy=line-item-quantity-0]').clear().type('1');
      cy.get('[data-cy=line-item-unit-price-0]').clear().type('2000.00');
      
      cy.get('[data-cy=save-invoice]').click();
      cy.wait(1000);
      
      // Mark as sent so it can be overdue
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=invoice-actions]').click();
      });
      cy.get('[data-cy=mark-sent]').click();
      cy.wait(1000);
    });

    it('should create an invoice due in 5 days (not overdue)', () => {
      cy.visit('/invoices');
      cy.get('[data-cy=create-invoice]').click();
      
      const today = new Date();
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      
      cy.get('[data-cy=invoice-client]').select('Overdue Test Client');
      cy.get('[data-cy=invoice-issue-date]').type(today.toISOString().split('T')[0]);
      cy.get('[data-cy=invoice-due-date]').type(fiveDaysFromNow.toISOString().split('T')[0]);
      cy.get('[data-cy=invoice-currency]').select('SEK');
      
      cy.get('[data-cy=add-line-item]').click();
      cy.get('[data-cy=line-item-description-0]').type('Not Yet Due Service');
      cy.get('[data-cy=line-item-quantity-0]').clear().type('1');
      cy.get('[data-cy=line-item-unit-price-0]').clear().type('1000.00');
      
      cy.get('[data-cy=save-invoice]').click();
      cy.wait(1000);
      
      cy.contains('Not Yet Due Service').parents('tr').within(() => {
        cy.get('[data-cy=invoice-actions]').click();
      });
      cy.get('[data-cy=mark-sent]').click();
      cy.wait(1000);
    });

    it('should create an invoice overdue by 45 days (older overdue)', () => {
      cy.visit('/invoices');
      cy.get('[data-cy=create-invoice]').click();
      
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      cy.get('[data-cy=invoice-client]').select('Overdue Test Client');
      cy.get('[data-cy=invoice-issue-date]').type(sixtyDaysAgo.toISOString().split('T')[0]);
      cy.get('[data-cy=invoice-due-date]').type(fortyFiveDaysAgo.toISOString().split('T')[0]);
      cy.get('[data-cy=invoice-currency]').select('SEK');
      
      cy.get('[data-cy=add-line-item]').click();
      cy.get('[data-cy=line-item-description-0]').type('Very Overdue Service');
      cy.get('[data-cy=line-item-quantity-0]').clear().type('1');
      cy.get('[data-cy=line-item-unit-price-0]').clear().type('5000.00');
      
      cy.get('[data-cy=save-invoice]').click();
      cy.wait(1000);
      
      cy.contains('Very Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=invoice-actions]').click();
      });
      cy.get('[data-cy=mark-sent]').click();
      cy.wait(1000);
    });
  });

  describe('Visual Overdue Indicators', () => {
    beforeEach(() => {
      cy.visit('/invoices');
      cy.wait(1000);
    });

    it('should highlight overdue invoice row in red', () => {
      cy.contains('Overdue Service').parents('tr')
        .should('have.class', 'bg-red-50')
        .should('be.visible');
    });

    it('should display days overdue for overdue invoices', () => {
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.contains('15 days overdue').should('be.visible');
      });
      
      cy.contains('Very Overdue Service').parents('tr').within(() => {
        cy.contains('45 days overdue').should('be.visible');
      });
    });

    it('should not highlight non-overdue invoices', () => {
      cy.contains('Not Yet Due Service').parents('tr')
        .should('not.have.class', 'bg-red-50');
    });

    it('should show different severity for very overdue invoices', () => {
      // 45 days overdue should have darker red
      cy.contains('Very Overdue Service').parents('tr')
        .should('have.class', 'bg-red-100');
    });
  });

  describe('Reminder Button and Actions', () => {
    beforeEach(() => {
      cy.visit('/invoices');
      cy.wait(1000);
    });

    it('should display send reminder button for overdue invoices', () => {
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').should('be.visible');
      });
    });

    it('should not display send reminder button for non-overdue invoices', () => {
      cy.contains('Not Yet Due Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').should('not.exist');
      });
    });

    it('should send reminder and update reminder count', () => {
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').click();
      });
      cy.wait(1000);
      
      // Should show reminder badge with count
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=reminder-badge]').should('be.visible');
        cy.get('[data-cy=reminder-badge]').should('contain', '1');
      });
    });

    it('should increment reminder count on subsequent reminders', () => {
      // Send second reminder
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').click();
      });
      cy.wait(1000);
      
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=reminder-badge]').should('contain', '2');
      });
      
      // Send third reminder
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').click();
      });
      cy.wait(1000);
      
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=reminder-badge]').should('contain', '3');
      });
    });
  });

  describe('Reminder Badge Display', () => {
    beforeEach(() => {
      cy.visit('/invoices');
      cy.wait(1000);
    });

    it('should display reminder badge after sending reminder', () => {
      // Send reminder to very overdue invoice
      cy.contains('Very Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').click();
      });
      cy.wait(1000);
      
      cy.contains('Very Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=reminder-badge]').should('be.visible');
        cy.get('[data-cy=reminder-badge]').should('have.class', 'bg-purple-100');
      });
    });

    it('should show correct reminder count in badge', () => {
      cy.contains('Overdue Service').parents('tr').within(() => {
        // Should show count from previous test
        cy.get('[data-cy=reminder-badge]').should('contain', '3');
      });
    });

    it('should not show reminder badge on invoices without reminders sent', () => {
      cy.contains('Not Yet Due Service').parents('tr').within(() => {
        cy.get('[data-cy=reminder-badge]').should('not.exist');
      });
    });
  });

  describe('Overdue Age Grouping', () => {
    beforeEach(() => {
      cy.visit('/invoices');
      cy.wait(1000);
    });

    it('should correctly categorize invoice overdue by 15 days (1-30 days)', () => {
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.contains('15 days overdue').should('be.visible');
      });
    });

    it('should correctly categorize invoice overdue by 45 days (31+ days)', () => {
      cy.contains('Very Overdue Service').parents('tr').within(() => {
        cy.contains('45 days overdue').should('be.visible');
      });
    });

    it('should apply appropriate styling based on overdue age', () => {
      // 15 days overdue - lighter red
      cy.contains('Overdue Service').parents('tr')
        .should('have.class', 'bg-red-50');
      
      // 45 days overdue - darker red
      cy.contains('Very Overdue Service').parents('tr')
        .should('have.class', 'bg-red-100');
    });
  });

  describe('Overdue Status After Payment', () => {
    it('should remove overdue styling after full payment', () => {
      // Navigate to overdue invoice
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=view-invoice]').click();
      });
      
      // Record full payment
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-method]').select('swish');
      cy.get('[data-cy=save-payment]').click();
      cy.wait(1000);
      
      // Go back to invoices list
      cy.visit('/invoices');
      cy.wait(1000);
      
      // Should no longer be highlighted as overdue
      cy.contains('Overdue Service').parents('tr')
        .should('not.have.class', 'bg-red-50');
      
      // Should not show days overdue
      cy.contains('Overdue Service').parents('tr')
        .should('not.contain', 'days overdue');
      
      // Should not show send reminder button
      cy.contains('Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=send-reminder]').should('not.exist');
      });
    });

    it('should still show as overdue after partial payment', () => {
      // Navigate to very overdue invoice
      cy.contains('Very Overdue Service').parents('tr').within(() => {
        cy.get('[data-cy=view-invoice]').click();
      });
      
      // Record partial payment
      cy.get('[data-cy=record-payment-btn]').click();
      cy.get('[data-cy=payment-amount]').clear().type('2000.00');
      cy.get('[data-cy=payment-method]').select('bank_transfer');
      cy.get('[data-cy=save-payment]').click();
      cy.wait(1000);
      
      // Go back to invoices list
      cy.visit('/invoices');
      cy.wait(1000);
      
      // Should still be highlighted as overdue
      cy.contains('Very Overdue Service').parents('tr')
        .should('have.class', 'bg-red-100');
      
      // Should still show days overdue
      cy.contains('Very Overdue Service').parents('tr')
        .should('contain', '45 days overdue');
    });
  });

  describe('Filter and Sort Overdue Invoices', () => {
    beforeEach(() => {
      cy.visit('/invoices');
      cy.wait(1000);
    });

    it('should filter to show only overdue invoices', () => {
      cy.get('[data-cy=filter-overdue]').click();
      
      // Should show overdue invoices
      cy.contains('Overdue Service').should('be.visible');
      cy.contains('Very Overdue Service').should('be.visible');
      
      // Should not show non-overdue invoices
      cy.contains('Not Yet Due Service').should('not.exist');
    });

    it('should sort overdue invoices by days overdue', () => {
      cy.get('[data-cy=sort-by-overdue]').click();
      
      // Very overdue (45 days) should appear before regular overdue (15 days)
      cy.get('[data-cy=invoice-row]').first().should('contain', 'Very Overdue Service');
    });
  });

  after(() => {
    cy.log('Overdue invoice tests completed - cleanup would happen here in production');
  });
});
