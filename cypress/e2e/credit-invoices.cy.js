describe('Credit Invoices (US-063)', () => {
  const testUser = {
    email: 'thomas@communitaslabs.io',
    password: 'test123'
  };

  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-cy="email-input"]').type(testUser.email);
    cy.get('[data-cy="password-input"]').type(testUser.password);
    cy.get('[data-cy="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should show invoice type selector in new invoice form', () => {
    cy.get('[data-cy="nav-invoices"]').click();
    cy.url().should('include', '/invoices');
    
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Verify invoice type selector is visible
    cy.get('[data-cy="invoice-type-select"]').should('be.visible');
    cy.get('[data-cy="invoice-type-select"]').should('have.value', 'DEBET'); // Default
  });

  it('should show original invoice selector when CREDIT type is selected', () => {
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Select CREDIT type
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    
    // Verify original invoice selector appears
    cy.get('[data-cy="credited-invoice-select"]').should('not.exist'); // Client not selected yet
    
    // Select client first
    cy.get('[data-cy="client-select"]').select(1);
    
    // Now credited invoice selector should show options
    cy.get('[data-cy="credited-invoice-select"]').should('be.visible');
  });

  it('should create a standard DEBET invoice', () => {
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Invoice type defaults to DEBET
    cy.get('[data-cy="invoice-type-select"]').should('have.value', 'DEBET');
    
    // Fill form
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-15');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-15');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-15');
    
    // Add line item
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Standard Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');
    
    // Save
    cy.get('[data-cy="save-invoice-button"]').click();
    
    // Verify invoice was created
    cy.wait(2000);
    cy.contains('Standard Service').should('exist');
  });

  it('should create a CREDIT invoice linked to original invoice', () => {
    // First, create a DEBET invoice to credit
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
    cy.wait(2000);
    
    // Now create credit invoice
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Select CREDIT type
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    
    // Select client (should match original)
    cy.get('[data-cy="client-select"]').select(1);
    
    // Select original invoice to credit
    cy.get('[data-cy="credited-invoice-select"]').should('be.visible');
    cy.get('[data-cy="credited-invoice-select"]').select(1);
    
    // Fill dates
    cy.get('[data-cy="issue-date-input"]').type('2024-01-20');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-20');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-20');
    
    // Add credit line (negative quantity)
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Credit for service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('-2'); // Negative for credit
    cy.get('[data-cy="row-unit-price-0"]').clear().type('500');
    
    // Save
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait(2000);
    
    // Verify credit invoice was created
    cy.contains('Credit for service').should('exist');
  });

  it('should display credit badge for CREDIT invoices in list', () => {
    // Create a credit invoice first
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Create DEBET invoice
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-05');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-05');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-05');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Original');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait(2000);
    
    // Create CREDIT invoice
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
    cy.wait(2000);
    
    // Verify credit badge exists in invoice list
    // The credit invoice should have a credit note badge
    cy.get('[data-cy^="invoice-type-"]').should('exist');
  });

  it('should require client selection before showing credited invoice options', () => {
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Select CREDIT type without selecting client
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    
    // Credited invoice dropdown should not show options (no client selected)
    cy.get('[data-cy="credited-invoice-select"]').should('not.exist');
    
    // Select client
    cy.get('[data-cy="client-select"]').select(1);
    
    // Now credited invoice selector should appear
    cy.get('[data-cy="credited-invoice-select"]').should('be.visible');
  });

  it('should handle partial credit (different line items)', () => {
    // Create original invoice with multiple line items
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-01');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-01');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-01');
    
    // Add two line items
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Item 1');
    cy.get('[data-cy="row-quantity-0"]').clear().type('2');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-1"]').type('Item 2');
    cy.get('[data-cy="row-quantity-1"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-1"]').clear().type('200');
    
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait(2000);
    
    // Create partial credit (only one item)
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-type-select"]').select('CREDIT');
    cy.get('[data-cy="client-select"]').select(1);
    cy.get('[data-cy="credited-invoice-select"]').select(1);
    cy.get('[data-cy="issue-date-input"]').type('2024-01-02');
    cy.get('[data-cy="delivery-date-input"]').clear().type('2024-01-02');
    cy.get('[data-cy="due-date-input"]').clear().type('2024-02-02');
    
    // Credit only item 1 (partial quantity)
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Partial credit for Item 1');
    cy.get('[data-cy="row-quantity-0"]').clear().type('-1'); // Only credit 1 of 2
    cy.get('[data-cy="row-unit-price-0"]').clear().type('100');
    
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait(2000);
    
    // Verify partial credit exists
    cy.contains('Partial credit for Item 1').should('exist');
  });
});
