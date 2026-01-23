describe('Manual Invoice Numbering (US-064)', () => {
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

  it('should allow toggling between automatic and manual numbering modes', () => {
    // Navigate to organization settings
    cy.get('[data-cy="nav-settings"]').click();
    cy.url().should('include', '/settings');

    // Check current numbering mode
    cy.get('[data-cy="invoice-numbering-mode"]').should('exist');
    
    // Switch to manual mode
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    
    // Verify success message or page update
    cy.wait(1000);
    
    // Switch back to automatic mode
    cy.get('[data-cy="invoice-numbering-mode"]').select('automatic');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait(1000);
  });

  it('should show invoice number field when manual mode is enabled', () => {
    // First, enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait(1000);

    // Navigate to invoices
    cy.get('[data-cy="nav-invoices"]').click();
    cy.url().should('include', '/invoices');

    // Open new invoice modal
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Verify invoice number field is visible
    cy.get('[data-cy="invoice-number-input"]').should('be.visible');
  });

  it('should create invoice with manual invoice number', () => {
    // Enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait(1000);

    // Navigate to invoices
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();

    // Fill in manual invoice number
    const manualInvoiceNumber = `MANUAL-${Date.now()}`;
    cy.get('[data-cy="invoice-number-input"]').type(manualInvoiceNumber);

    // Fill required fields
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    
    // Add at least one line item
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');

    // Save invoice
    cy.get('[data-cy="save-invoice-button"]').click();

    // Verify invoice was created with custom number
    cy.wait(2000);
    cy.contains(manualInvoiceNumber).should('exist');
  });

  it('should prevent creating invoice without number in manual mode', () => {
    // Enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait(1000);

    // Navigate to invoices
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();

    // Fill required fields but NOT invoice number
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    
    // Add line item
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');

    // Try to save - should fail validation
    cy.get('[data-cy="save-invoice-button"]').click();

    // Verify error message or that modal is still open
    cy.get('[data-cy="invoice-modal"]').should('exist');
  });

  it('should auto-generate invoice number in automatic mode', () => {
    // Ensure automatic mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('automatic');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait(1000);

    // Navigate to invoices
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();

    // Verify invoice number field is NOT visible
    cy.get('[data-cy="invoice-number-input"]').should('not.exist');

    // Fill required fields
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    
    // Add line item
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');

    // Save invoice
    cy.get('[data-cy="save-invoice-button"]').click();

    // Verify invoice was created with auto-generated number (INV-XXXX format)
    cy.wait(2000);
    cy.contains(/INV-\d{4}/).should('exist');
  });

  it('should prevent duplicate manual invoice numbers', () => {
    // Enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait(1000);

    // Create first invoice with manual number
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();

    const duplicateNumber = `DUP-${Date.now()}`;
    cy.get('[data-cy="invoice-number-input"]').type(duplicateNumber);
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');
    cy.get('[data-cy="save-invoice-button"]').click();
    cy.wait(2000);

    // Try to create second invoice with same number
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-number-input"]').type(duplicateNumber);
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-16');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-16');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Another Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('500');
    cy.get('[data-cy="save-invoice-button"]').click();

    // Should show error about duplicate
    cy.wait(1000);
    cy.get('[data-cy="invoice-modal"]').should('exist');
  });
});
