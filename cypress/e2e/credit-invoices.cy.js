describe('Credit Invoices (US-063)', () => {
  beforeEach(() => {
    // Login first to establish session
    cy.login('user')
    
    // Set up common intercepts with test data
    cy.setupCommonIntercepts({
      clients: [
        { id: 'client-1', name: 'Test Client AB', email: 'client@test.com', country: 'Sweden' }
      ],
      invoices: []
    })

    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      req.reply({
        statusCode: 201,
        body: { 
          id: 'new-invoice-id', 
          invoice_number: `INV-${Date.now()}`,
          ...req.body 
        }
      })
    }).as('createInvoice')

    cy.intercept('POST', '**/rest/v1/invoice_rows*', {
      statusCode: 201,
      body: []
    }).as('createInvoiceRows')

    cy.visit('/dashboard')
  });

  it('is expected to show invoice type selector in new invoice form', () => {
    // Arrange
    cy.getByCy('nav-invoices').click();
    cy.url().should('include', '/invoices');
    
    // Act
    cy.getByCy('new-invoice-button').click();
    
    // Assert
    cy.getByCy('invoice-type-select').should('be.visible');
    cy.getByCy('invoice-type-select').should('have.value', 'DEBET');
  });

  it('is expected to show original invoice selector when CREDIT type is selected', () => {
    // Arrange
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    
    // Act
    cy.getByCy('invoice-type-select').select('CREDIT');
    
    // Assert
    cy.getByCy('credited-invoice-select').should('not.exist');
    
    // Act - Select client
    cy.getByCy('client-select').select(1);
    
    // Assert
    cy.getByCy('credited-invoice-select').should('be.visible');
  });

  it('is expected to create a standard DEBET invoice', () => {
    // Arrange
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-type-select').should('have.value', 'DEBET');
    
    // Act
    cy.getByCy('client-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-15');
    cy.getByCy('delivery-date-input').clear().type('2024-01-15');
    cy.getByCy('due-date-input').clear().type('2024-02-15');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Standard Service');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('1000');
    cy.getByCy('save-invoice-button').click();
    
    // Assert
    cy.wait('@createInvoice')
    cy.contains('Standard Service', { timeout: 5000 }).should('be.visible');
  });

  it('is expected to create a CREDIT invoice linked to original invoice', () => {
    // Arrange - Create a DEBET invoice to credit
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('client-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-10');
    cy.getByCy('delivery-date-input').clear().type('2024-01-10');
    cy.getByCy('due-date-input').clear().type('2024-02-10');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Service to be credited');
    cy.getByCy('row-quantity-0').clear().type('2');
    cy.getByCy('row-unit-price-0').clear().type('500');
    cy.getByCy('save-invoice-button').click();
    cy.wait('@createInvoice')
    
    // Act - Create credit invoice
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-type-select').select('CREDIT');
    cy.getByCy('client-select').select(1);
    cy.getByCy('credited-invoice-select').should('be.visible');
    cy.getByCy('credited-invoice-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-20');
    cy.getByCy('delivery-date-input').clear().type('2024-01-20');
    cy.getByCy('due-date-input').clear().type('2024-02-20');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Credit for service');
    cy.getByCy('row-quantity-0').clear().type('-2');
    cy.getByCy('row-unit-price-0').clear().type('500');
    cy.getByCy('save-invoice-button').click();
    
    // Assert
    cy.wait('@createInvoice')
    cy.contains('Credit for service', { timeout: 5000 }).should('be.visible');
  });

  it('is expected to display credit badge for CREDIT invoices in list', () => {
    // Arrange - Create DEBET invoice
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('client-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-05');
    cy.getByCy('delivery-date-input').clear().type('2024-01-05');
    cy.getByCy('due-date-input').clear().type('2024-02-05');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Original');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('100');
    cy.getByCy('save-invoice-button').click();
    cy.wait('@createInvoice')
    
    // Act - Create CREDIT invoice
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-type-select').select('CREDIT');
    cy.getByCy('client-select').select(1);
    cy.getByCy('credited-invoice-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-06');
    cy.getByCy('delivery-date-input').clear().type('2024-01-06');
    cy.getByCy('due-date-input').clear().type('2024-02-06');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Credit');
    cy.getByCy('row-quantity-0').clear().type('-1');
    cy.getByCy('row-unit-price-0').clear().type('100');
    cy.getByCy('save-invoice-button').click();
    cy.wait('@createInvoice')
    
    // Assert
    cy.get('[data-cy^="invoice-type-"]').should('exist');
  });

  it('is expected to require client selection before showing credited invoice options', () => {
    // Arrange
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    
    // Act
    cy.getByCy('invoice-type-select').select('CREDIT');
    
    // Assert
    cy.getByCy('credited-invoice-select').should('not.exist');
    
    // Act - Select client
    cy.getByCy('client-select').select(1);
    
    // Assert
    cy.getByCy('credited-invoice-select').should('be.visible');
  });

  it('is expected to handle partial credit (different line items)', () => {
    // Arrange - Create original invoice with multiple line items
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('client-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-01');
    cy.getByCy('delivery-date-input').clear().type('2024-01-01');
    cy.getByCy('due-date-input').clear().type('2024-02-01');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Item 1');
    cy.getByCy('row-quantity-0').clear().type('2');
    cy.getByCy('row-unit-price-0').clear().type('100');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-1').type('Item 2');
    cy.getByCy('row-quantity-1').clear().type('1');
    cy.getByCy('row-unit-price-1').clear().type('200');
    cy.getByCy('save-invoice-button').click();
    cy.wait('@createInvoice')
    
    // Act - Create partial credit (only one item)
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-type-select').select('CREDIT');
    cy.getByCy('client-select').select(1);
    cy.getByCy('credited-invoice-select').select(1);
    cy.getByCy('issue-date-input').type('2024-01-02');
    cy.getByCy('delivery-date-input').clear().type('2024-01-02');
    cy.getByCy('due-date-input').clear().type('2024-02-02');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Partial credit for Item 1');
    cy.getByCy('row-quantity-0').clear().type('-1');
    cy.getByCy('row-unit-price-0').clear().type('100');
    cy.getByCy('save-invoice-button').click();
    
    // Assert
    cy.wait('@createInvoice')
    cy.contains('Partial credit for Item 1', { timeout: 5000 }).should('be.visible');
  });
});
