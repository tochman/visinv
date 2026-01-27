describe('Credit Invoices (US-063)', () => {
  const mockClient = {
    id: 'client-1',
    name: 'Test Client AB',
    email: 'client@test.com',
    country: 'Sweden'
  };

  beforeEach(() => {
    // Login first to establish session
    cy.login('admin')
    
    // Set up common intercepts with test data
    cy.setupCommonIntercepts({
      clients: [mockClient],
      invoices: []
    })

    cy.intercept('POST', '**/rest/v1/invoices*', (req) => {
      req.reply({
        statusCode: 201,
        body: { 
          id: 'new-invoice-id', 
          invoice_number: `INV-${Date.now()}`,
          ...req.body,
          client: mockClient
        }
      })
    }).as('createInvoice')

    cy.intercept('POST', '**/rest/v1/invoice_rows*', {
      statusCode: 201,
      body: []
    }).as('createInvoiceRows')

    // Navigate to invoices page
    cy.getByCy('sidebar-nav-invoices').click()
    cy.wait('@getInvoices')
  });

  it('is expected to show invoice type selector in new invoice form', () => {
    // Act
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    
    // Assert
    cy.getByCy('invoice-type-select').should('be.visible');
    cy.getByCy('invoice-type-select').should('have.value', 'DEBET');
  });

  it('is expected to show original invoice selector when CREDIT type is selected', () => {
    // Arrange
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    
    // Act - Select CREDIT type
    cy.getByCy('invoice-type-select').select('CREDIT');
    
    // Assert - credited invoice selector appears when CREDIT is selected
    cy.getByCy('credited-invoice-select').should('be.visible');
  });

  it('is expected to create a standard DEBET invoice', () => {
    // Arrange
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    cy.getByCy('invoice-type-select').should('have.value', 'DEBET');
    
    // Wait for data to load
    cy.wait('@getClients');
    
    // Act - Select client
    cy.getByCy('client-select').select(mockClient.name);
    
    // Dates are pre-filled, just verify they exist
    cy.getByCy('issue-date-input').should('exist');
    cy.getByCy('due-date-input').should('exist');
    
    // Fill line item (already exists by default)
    cy.getByCy('description-input-0').type('Standard Service');
    cy.getByCy('quantity-input-0').clear().type('1');
    cy.getByCy('unit-price-input-0').clear().type('1000');
    
    cy.getByCy('save-draft-button').scrollIntoView().click();
    
    // Assert
    cy.wait('@createInvoice');
    cy.getByCy('invoice-modal').should('not.exist');
  });

  it('is expected to create a CREDIT invoice linked to original invoice', () => {
    // First mock an existing DEBET invoice to credit
    const existingInvoice = {
      id: 'existing-inv-1',
      invoice_number: 'INV-0001',
      client_id: mockClient.id,
      client: mockClient,
      invoice_type: 'DEBET',
      total_amount: 1000,
      status: 'sent'
    };

    // Update intercept with existing invoice
    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: [existingInvoice]
    }).as('getInvoicesWithExisting');

    // Refresh to pick up new intercept
    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoicesWithExisting');

    // Act - Create credit invoice
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    cy.wait('@getClients');
    
    cy.getByCy('invoice-type-select').select('CREDIT');
    cy.getByCy('client-select').select(mockClient.name);
    
    // Now credited invoice select should have options - select by invoice ID (the value)
    cy.getByCy('credited-invoice-select').should('be.visible');
    cy.getByCy('credited-invoice-select').select(existingInvoice.id);
    
    // Fill line item for credit
    cy.getByCy('description-input-0').type('Credit for service');
    cy.getByCy('quantity-input-0').clear().type('-1');
    cy.getByCy('unit-price-input-0').clear().type('1000');
    
    cy.getByCy('save-draft-button').scrollIntoView().click();
    
    // Assert
    cy.wait('@createInvoice');
    cy.getByCy('invoice-modal').should('not.exist');
  });

  it('is expected to display credit badge for CREDIT invoices in list', () => {
    // Mock invoices list with a CREDIT invoice
    const invoices = [
      {
        id: 'inv-debet',
        invoice_number: 'INV-0001',
        client_id: mockClient.id,
        client: mockClient,
        invoice_type: 'DEBET',
        total_amount: 1000,
        status: 'sent'
      },
      {
        id: 'inv-credit',
        invoice_number: 'INV-0002',
        client_id: mockClient.id,
        client: mockClient,
        invoice_type: 'CREDIT',
        credited_invoice_id: 'inv-debet',
        total_amount: -1000,
        status: 'sent'
      }
    ];

    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: invoices
    }).as('getInvoicesWithCredit');

    // Refresh to pick up new intercept
    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoicesWithCredit');
    
    // Assert - should see invoice type indicators
    cy.get('[data-cy^="invoice-type-"]').should('exist');
  });

  it('is expected to require client selection before showing credited invoice options', () => {
    // Mock an existing DEBET invoice
    const existingInvoice = {
      id: 'existing-inv-1',
      invoice_number: 'INV-0001',
      client_id: mockClient.id,
      client: mockClient,
      invoice_type: 'DEBET',
      total_amount: 1000,
      status: 'sent'
    };

    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: [existingInvoice]
    }).as('getInvoicesWithExisting');

    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoicesWithExisting');

    // Arrange
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    cy.wait('@getClients');
    
    // Act - Select CREDIT type first (without client)
    cy.getByCy('invoice-type-select').select('CREDIT');
    
    // Assert - credited invoice select appears but has no options (empty)
    cy.getByCy('credited-invoice-select').should('be.visible');
    
    // Act - Now select client
    cy.getByCy('client-select').select(mockClient.name);
    
    // Assert - credited invoice select should now have the invoice option
    cy.getByCy('credited-invoice-select').find('option').should('have.length.greaterThan', 1);
  });

  it('is expected to handle partial credit (different line items)', () => {
    // Mock an existing DEBET invoice with multiple line items
    const existingInvoice = {
      id: 'existing-inv-1',
      invoice_number: 'INV-0001',
      client_id: mockClient.id,
      client: mockClient,
      invoice_type: 'DEBET',
      total_amount: 400,
      status: 'sent'
    };

    cy.intercept('GET', '**/rest/v1/invoices*', {
      statusCode: 200,
      body: [existingInvoice]
    }).as('getInvoicesWithExisting');

    cy.getByCy('sidebar-nav-invoices').click();
    cy.wait('@getInvoicesWithExisting');

    // Act - Create partial credit
    cy.getByCy('create-invoice-button').click();
    cy.getByCy('invoice-modal').should('be.visible');
    cy.wait('@getClients');
    
    cy.getByCy('invoice-type-select').select('CREDIT');
    cy.getByCy('client-select').select(mockClient.name);
    cy.getByCy('credited-invoice-select').select(existingInvoice.id);
    
    // Add partial credit line item
    cy.getByCy('description-input-0').type('Partial credit for Item 1');
    cy.getByCy('quantity-input-0').clear().type('-1');
    cy.getByCy('unit-price-input-0').clear().type('100');
    
    cy.getByCy('save-draft-button').scrollIntoView().click();
    
    // Assert
    cy.wait('@createInvoice');
    cy.getByCy('invoice-modal').should('not.exist');
  });
});
