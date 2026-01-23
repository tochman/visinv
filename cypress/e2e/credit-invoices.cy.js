describe('Credit Invoices (US-063)', () => {
  beforeEach(() => {
    // Login first to establish session
    cy.login('user')
    
    // Then set up test-specific intercepts
    cy.intercept('GET', '**/rest/v1/clients*', {
      statusCode: 200,
      body: [
        { id: 'client-1', name: 'Test Client AB', email: 'client@test.com', country: 'Sweden' }
      ]
    }).as('getClients')

    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: []
    }).as('getInvoices')

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
    cy.get('[data-cy="nav-invoices"]').click();
    cy.url().should('include', '/invoices');
    
    // Act
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Assert
    cy.get('[data-cy="invoice-type-select"]').should('be.visible');
    cy.get('[data-cy="invoice-type-select"]').should('have.value', 'DEBET');
  });

  it('is expected to show original invoice selector when CREDIT type is selected', () => {
    // Arrange
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Act
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    
    // Assert
    cy.get('[data-cy="credited-invoice-select"]').should('not.exist');
    
    // Act - Select client
    cy.get('[data-cy="client-select"]').select(1);
    
    // Assert
    cy.get('[data-cy="credited-invoice-select"]').should('be.visible');
  });

  it('is expected to create a standard DEBET invoice', () => {
    // Arrange
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-type-select"]').should('have.value', 'DEBET');
    
    // Act
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-15');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-15');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-15');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Standard Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');
    cy.get('[data-cy="save-invoice-button"]').click();
    
    // Assert
    cy.wait('@createInvoice')
    cy.contains('Standard Service', { timeout: 5000 }).should('be.visible');
  });

  it('is expected to create a CREDIT invoice linked to original invoice', () => {
    // Arrange - Create a DEBET invoice to credit
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-10');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-10');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-10');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Service to be credited');
    cy.get('[data-cy="row-quantity-0"]').clear().type('2');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('500');
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait('@createInvoice')
    
    // Act - Create credit invoice
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="credited-invoice-select"]').should('be.visible');
    cy.get('[data-cy="credited-invoice-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-20');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-20');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-20');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Credit for service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('-2');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('500');
    cy.get('[data-cy="save-invoice-button"]').click();
    
    // Assert
    cy.wait('@createInvoice')
    cy.contains('Credit for service', { timeout: 5000 }).should('be.visible');
  });

  it('is expected to display credit badge for CREDIT invoices in list', () => {
    // Arrange - Create DEBET invoice
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-05');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-05');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-05');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Original');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait('@createInvoice')
    
    // Act - Create CREDIT invoice
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="credited-invoice-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-06');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-06');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-06');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Credit');
    cy.get('[data-cy="row-quantity-0"]').clear().type('-1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait('@createInvoice')
    
    // Assert
    cy.get('[data-cy^="invoice-type-"]').should('exist');
  });

  it('is expected to require client selection before showing credited invoice options', () => {
    // Arrange
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Act
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    
    // Assert
    cy.get('[data-cy="credited-invoice-select"]').should('not.exist');
    
    // Act - Select client
    cy.get('[data-cy="client-select"]').select(1);
    
    // Assert
    cy.get('[data-cy="credited-invoice-select"]').should('be.visible');
  });

  it('is expected to handle partial credit (different line items)', () => {
    // Arrange - Create original invoice with multiple line items
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-01');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-01');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-01');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Item 1');
    cy.get('[data-cy="row-quantity-0"]').clear().type('2');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-1"]').type('Item 2');
    cy.get('[data-cy="row-quantity-1"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-1"]').clear().type('200');
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait('@createInvoice')
    
    // Act - Create partial credit (only one item)
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="credited-invoice-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-02');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-02');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-02');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Partial credit for Item 1');
    cy.get('[data-cy="row-quantity-0"]').clear().type('-1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    cy.get('[data-cy="save-invoice-button"]').click();
    
    // Assert
    cy.wait('@createInvoice')
    cy.contains('Partial credit for Item 1', { timeout: 5000 }).should('be.visible');
  });
});
