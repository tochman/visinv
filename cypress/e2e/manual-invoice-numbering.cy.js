describe('Manual Invoice Numbering (US-064)', () => {
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
          invoice_number: req.body.invoice_number || `INV-${Date.now()}`,
          ...req.body 
        }
      })
    }).as('createInvoice')

    cy.intercept('PATCH', '**/rest/v1/organizations**', (req) => {
      req.reply({
        statusCode: 200,
        body: { ...req.body }
      })
    }).as('updateOrganization')

    cy.visit('/dashboard')
  });

  it('is expected to allow toggling between automatic and manual numbering modes', () => {
    // Arrange
    cy.get('[data-cy="nav-settings"]').click();
    cy.url().should('include', '/settings');
    cy.get('[data-cy="invoice-numbering-mode"]').should('exist');
    
    // Act - Switch to manual mode
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    
    // Assert
    cy.wait('@updateOrganization')
    
    // Act - Switch back to automatic mode
    cy.get('[data-cy="invoice-numbering-mode"]').select('automatic');
    cy.get('[data-cy="save-organization-settings"]').click();
    
    // Assert
    cy.wait('@updateOrganization')
  });

  it('is expected to show invoice number field when manual mode is enabled', () => {
    // Arrange - Enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait('@updateOrganization')

    // Act
    cy.get('[data-cy="nav-invoices"]').click();
    cy.url().should('include', '/invoices');
    cy.get('[data-cy="new-invoice-button"]').click();
    
    // Assert
    cy.get('[data-cy="invoice-number-input"]').should('be.visible');
  });

  it('is expected to create invoice with manual invoice number', () => {
    // Arrange - Enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait('@updateOrganization')

    // Act
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    const manualInvoiceNumber = `MANUAL-${Date.now()}`;
    cy.get('[data-cy="invoice-number-input"]').type(manualInvoiceNumber);
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');
    cy.get('[data-cy="save-invoice-button"]').click();

    // Assert
    cy.wait('@createInvoice')
    cy.contains(manualInvoiceNumber, { timeout: 5000 }).should('be.visible');
  });

  it('is expected to prevent creating invoice without number in manual mode', () => {
    // Arrange - Enable manual mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait('@updateOrganization')

    // Act
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');
    cy.get('[data-cy="save-invoice-button"]').click();

    // Assert
    cy.get('[data-cy="invoice-modal"]').should('exist');
  });

  it('is expected to auto-generate invoice number in automatic mode', () => {
    // Arrange - Ensure automatic mode
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('automatic');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait('@updateOrganization')

    // Act
    cy.get('[data-cy="nav-invoices"]').click();
    cy.get('[data-cy="new-invoice-button"]').click();
    cy.get('[data-cy="invoice-number-input"]').should('not.exist');
    cy.get('[data-cy="invoice-client-select"]').select(1);
    cy.get('[data-cy="invoice-issue-date"]').type('2024-01-15');
    cy.get('[data-cy="invoice-due-date"]').type('2024-02-15');
    cy.get('[data-cy="add-row-button"]').click();
    cy.get('[data-cy="row-description-0"]').type('Test Service');
    cy.get('[data-cy="row-quantity-0"]').clear().type('1');
    cy.get('[data-cy="row-unit-price-0"]').clear().type('1000');
    cy.get('[data-cy="save-invoice-button"]').click();

    // Assert
    cy.wait('@createInvoice')
    cy.contains(/INV-\d{4}/, { timeout: 5000 }).should('be.visible');
  });

  it('is expected to prevent duplicate manual invoice numbers', () => {
    // Arrange - Enable manual mode and create first invoice
    cy.get('[data-cy="nav-settings"]').click();
    cy.get('[data-cy="invoice-numbering-mode"]').select('manual');
    cy.get('[data-cy="save-organization-settings"]').click();
    cy.wait('@updateOrganization')
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
    cy.wait('@createInvoice')

    // Act - Try to create second invoice with same number
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

    // Assert
    cy.get('[data-cy="invoice-modal"]', { timeout: 3000 }).should('exist');
  });
});
