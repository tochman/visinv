/**
 * Screenshot capture for Payment UI
 * This test creates sample data and takes screenshots of the new payment features
 */

describe('Payment UI Screenshots', () => {
  before(() => {
    cy.login('admin');
    cy.visit('/invoices');
  });

  it('should capture invoice detail with payment button', () => {
    // Click on first invoice if exists
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy=view-invoice]').length > 0) {
        cy.get('[data-cy=view-invoice]').first().click();
        cy.wait(1000);
        cy.screenshot('01-invoice-detail-with-payment-button');
      }
    });
  });

  it('should capture payment modal', () => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy=record-payment-btn]').length > 0) {
        cy.get('[data-cy=record-payment-btn]').click();
        cy.wait(500);
        cy.screenshot('02-payment-modal');
        cy.get('[data-cy=close-payment-modal]').click();
      }
    });
  });

  it('should capture invoice list with overdue indicators', () => {
    cy.visit('/invoices');
    cy.wait(1000);
    cy.screenshot('03-invoice-list-overdue-indicators');
  });

  it('should capture payment history', () => {
    cy.visit('/invoices');
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy=view-invoice]').length > 0) {
        cy.get('[data-cy=view-invoice]').first().click();
        cy.wait(1000);
        cy.get('body').then(($detail) => {
          if ($detail.find('[data-cy=payment-history-table]').length > 0) {
            cy.screenshot('04-payment-history');
          }
        });
      }
    });
  });
});
