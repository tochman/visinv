describe('Manual Invoice Numbering (US-064)', () => {
  beforeEach(() => {
    // Mock required API endpoints
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

    // Use mocked authentication instead of real credentials
    cy.login('user')
    cy.visit('/dashboard')
  });

  it('is expected to allow toggling between automatic and manual numbering modes', () => {
    // Arrange
    cy.getByCy('nav-settings').click();
    cy.url().should('include', '/settings');
    cy.getByCy('invoice-numbering-mode').should('exist');
    
    // Act - Switch to manual mode
    cy.getByCy('invoice-numbering-mode').select('manual');
    cy.getByCy('save-organization-settings').click();
    
    // Assert
    cy.wait('@updateOrganization')
    
    // Act - Switch back to automatic mode
    cy.getByCy('invoice-numbering-mode').select('automatic');
    cy.getByCy('save-organization-settings').click();
    
    // Assert
    cy.wait('@updateOrganization')
  });

  it('is expected to show invoice number field when manual mode is enabled', () => {
    // Arrange - Enable manual mode
    cy.getByCy('nav-settings').click();
    cy.getByCy('invoice-numbering-mode').select('manual');
    cy.getByCy('save-organization-settings').click();
    cy.wait('@updateOrganization')

    // Act
    cy.getByCy('nav-invoices').click();
    cy.url().should('include', '/invoices');
    cy.getByCy('new-invoice-button').click();
    
    // Assert
    cy.getByCy('invoice-number-input').should('be.visible');
  });

  it('is expected to create invoice with manual invoice number', () => {
    // Arrange - Enable manual mode
    cy.getByCy('nav-settings').click();
    cy.getByCy('invoice-numbering-mode').select('manual');
    cy.getByCy('save-organization-settings').click();
    cy.wait('@updateOrganization')

    // Act
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    const manualInvoiceNumber = `MANUAL-${Date.now()}`;
    cy.getByCy('invoice-number-input').type(manualInvoiceNumber);
    cy.getByCy('invoice-client-select').select(1);
    cy.getByCy('invoice-issue-date').type('2024-01-15');
    cy.getByCy('invoice-due-date').type('2024-02-15');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Test Service');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('1000');
    cy.getByCy('save-invoice-button').click();

    // Assert
    cy.wait('@createInvoice')
    cy.contains(manualInvoiceNumber, { timeout: 5000 }).should('be.visible');
  });

  it('is expected to prevent creating invoice without number in manual mode', () => {
    // Arrange - Enable manual mode
    cy.getByCy('nav-settings').click();
    cy.getByCy('invoice-numbering-mode').select('manual');
    cy.getByCy('save-organization-settings').click();
    cy.wait('@updateOrganization')

    // Act
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-client-select').select(1);
    cy.getByCy('invoice-issue-date').type('2024-01-15');
    cy.getByCy('invoice-due-date').type('2024-02-15');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Test Service');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('1000');
    cy.getByCy('save-invoice-button').click();

    // Assert
    cy.getByCy('invoice-modal').should('exist');
  });

  it('is expected to auto-generate invoice number in automatic mode', () => {
    // Arrange - Ensure automatic mode
    cy.getByCy('nav-settings').click();
    cy.getByCy('invoice-numbering-mode').select('automatic');
    cy.getByCy('save-organization-settings').click();
    cy.wait('@updateOrganization')

    // Act
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-number-input').should('not.exist');
    cy.getByCy('invoice-client-select').select(1);
    cy.getByCy('invoice-issue-date').type('2024-01-15');
    cy.getByCy('invoice-due-date').type('2024-02-15');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Test Service');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('1000');
    cy.getByCy('save-invoice-button').click();

    // Assert
    cy.wait('@createInvoice')
    cy.contains(/INV-\d{4}/, { timeout: 5000 }).should('be.visible');
  });

  it('is expected to prevent duplicate manual invoice numbers', () => {
    // Arrange - Enable manual mode and create first invoice
    cy.getByCy('nav-settings').click();
    cy.getByCy('invoice-numbering-mode').select('manual');
    cy.getByCy('save-organization-settings').click();
    cy.wait('@updateOrganization')
    cy.getByCy('nav-invoices').click();
    cy.getByCy('new-invoice-button').click();
    const duplicateNumber = `DUP-${Date.now()}`;
    cy.getByCy('invoice-number-input').type(duplicateNumber);
    cy.getByCy('invoice-client-select').select(1);
    cy.getByCy('invoice-issue-date').type('2024-01-15');
    cy.getByCy('invoice-due-date').type('2024-02-15');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Test Service');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('1000');
    cy.getByCy('save-invoice-button').click();
    cy.wait('@createInvoice')

    // Act - Try to create second invoice with same number
    cy.getByCy('new-invoice-button').click();
    cy.getByCy('invoice-number-input').type(duplicateNumber);
    cy.getByCy('invoice-client-select').select(1);
    cy.getByCy('invoice-issue-date').type('2024-01-16');
    cy.getByCy('invoice-due-date').type('2024-02-16');
    cy.getByCy('add-row-button').click();
    cy.getByCy('row-description-0').type('Another Service');
    cy.getByCy('row-quantity-0').clear().type('1');
    cy.getByCy('row-unit-price-0').clear().type('500');
    cy.getByCy('save-invoice-button').click();

    // Assert
    cy.getByCy('invoice-modal', { timeout: 3000 }).should('exist');
  });
});
