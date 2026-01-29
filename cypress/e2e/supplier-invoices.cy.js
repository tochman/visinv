describe('Supplier Invoices', () => {
  beforeEach(() => {
    const mockSuppliers = [
      {
        id: 1,
        organization_id: 1,
        name: 'Test Supplier AB',
        org_number: '556789-1234',
        payment_terms_days: 30,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ];

    const mockAccounts = [
      { id: 1, account_number: '4010', account_name: 'Office Supplies', organization_id: 1, account_type: 'expense' },
      { id: 2, account_number: '2640', account_name: 'VAT Receivable', organization_id: 1, account_type: 'liability' },
      { id: 3, account_number: '2440', account_name: 'Accounts Payable', organization_id: 1, account_type: 'liability' }
    ];

    const mockFiscalYears = [
      { id: 1, organization_id: 1, year: 2024, start_date: '2024-01-01', end_date: '2024-12-31', is_locked: false }
    ];

    // Setup intercepts for supplier invoices
    cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
      statusCode: 200,
      body: []
    }).as('getSupplierInvoices');

    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: mockFiscalYears
    }).as('getFiscalYears');

    cy.setupCommonIntercepts({ 
      suppliers: mockSuppliers, 
      accounts: mockAccounts
    });
    
    cy.login('admin');
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display the supplier invoices page', () => {
      cy.getByCy('sidebar-nav-supplier-invoices').click();
      cy.url().should('include', '/supplier-invoices');
      cy.contains('Supplier Invoices').should('be.visible');
    });

    it('is expected to create a new supplier invoice with line items', () => {
      cy.intercept('POST', '**/rest/v1/supplier_invoices*', {
        statusCode: 201,
        body: [{
          id: 1,
          organization_id: 1,
          supplier_id: 1,
          invoice_number: 'SUP-001',
          invoice_date: '2024-01-15',
          due_date: '2024-02-14',
          description: 'Office supplies purchase',
          status: 'draft',
          total_amount: 1250,
          total_vat: 250,
          total_with_vat: 1500,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        }]
      }).as('createSupplierInvoice');

      cy.intercept('POST', '**/rest/v1/supplier_invoice_lines*', {
        statusCode: 201,
        body: [{
          id: 1,
          supplier_invoice_id: 1,
          description: 'Paper and pens',
          account_id: 1,
          quantity: 10,
          price: 100,
          amount: 1000,
          vat_rate: 25,
          vat_amount: 250
        }]
      }).as('createSupplierInvoiceLines');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();
      
      // Wait for modal to be visible
      cy.getByCy('supplier-invoice-modal').should('be.visible');
      
      // Fill out the form - use the first available supplier
      cy.getByCy('supplier-select').select(1); // Select by index instead of text
      cy.getByCy('invoice-number-input').type('SUP-001');
      cy.getByCy('invoice-date-input').type('2024-01-15');
      
      // Due date should auto-populate from supplier payment terms (30 days)
      cy.getByCy('due-date-input').should('have.value', '2024-02-14');
      
      cy.getByCy('description-input').type('Office supplies purchase');

      // Add line item
      cy.getByCy('line-description-0').type('Paper and pens');
      cy.getByCy('line-account-0').select('4010 - Office Supplies');
      cy.getByCy('line-quantity-0').clear().type('10');
      cy.getByCy('line-unit-price-0').clear().type('100');
      cy.getByCy('line-vat-rate-0').clear().type('25');

      // Verify calculations
      cy.getByCy('line-amount-0').should('contain', '1,000');
      cy.getByCy('line-vat-amount-0').should('contain', '250');
      cy.getByCy('subtotal-display').should('contain', '1,000');
      cy.getByCy('vat-display').should('contain', '250');
      cy.getByCy('total-display').should('contain', '1,250');

      cy.getByCy('submit-button').click();
      
      cy.wait('@createSupplierInvoice');
      cy.wait('@createSupplierInvoiceLines');
      cy.contains('Supplier invoice created successfully').should('be.visible');
    });

    it('is expected to add multiple line items and calculate totals correctly', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-invoice-supplier-select').select('Test Supplier AB');
      cy.getByCy('supplier-invoice-number-input').type('SUP-002');
      cy.getByCy('supplier-invoice-date-input').type('2024-01-15');

      // First line item
      cy.getByCy('supplier-invoice-line-description-0').type('Paper');
      cy.getByCy('supplier-invoice-line-account-0').select('4010 - Office Supplies');
      cy.getByCy('supplier-invoice-line-quantity-0').clear().type('5');
      cy.getByCy('supplier-invoice-line-price-0').clear().type('100');
      cy.getByCy('supplier-invoice-line-vat-rate-0').clear().type('25');

      // Add second line item
      cy.getByCy('add-line-item-btn').click();
      cy.getByCy('supplier-invoice-line-description-1').type('Pens');
      cy.getByCy('supplier-invoice-line-account-1').select('4010 - Office Supplies');
      cy.getByCy('supplier-invoice-line-quantity-1').clear().type('10');
      cy.getByCy('supplier-invoice-line-price-1').clear().type('50');
      cy.getByCy('supplier-invoice-line-vat-rate-1').clear().type('25');

      // Verify total calculations: (500 + 500) + (125 + 125) = 1,250
      cy.getByCy('supplier-invoice-total-amount').should('contain', '1,000.00');
      cy.getByCy('supplier-invoice-total-vat').should('contain', '250.00');
      cy.getByCy('supplier-invoice-total-with-vat').should('contain', '1,250.00');
    });

    it('is expected to remove a line item and recalculate totals', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-invoice-supplier-select').select('Test Supplier AB');
      cy.getByCy('supplier-invoice-number-input').type('SUP-003');
      cy.getByCy('supplier-invoice-date-input').type('2024-01-15');

      // Add two line items
      cy.getByCy('supplier-invoice-line-description-0').type('Item 1');
      cy.getByCy('supplier-invoice-line-account-0').select('4010 - Office Supplies');
      cy.getByCy('supplier-invoice-line-quantity-0').clear().type('1');
      cy.getByCy('supplier-invoice-line-price-0').clear().type('1000');
      cy.getByCy('supplier-invoice-line-vat-rate-0').clear().type('25');

      cy.getByCy('add-line-item-btn').click();
      cy.getByCy('supplier-invoice-line-description-1').type('Item 2');
      cy.getByCy('supplier-invoice-line-account-1').select('4010 - Office Supplies');
      cy.getByCy('supplier-invoice-line-quantity-1').clear().type('1');
      cy.getByCy('supplier-invoice-line-price-1').clear().type('500');
      cy.getByCy('supplier-invoice-line-vat-rate-1').clear().type('25');

      // Total should be 1,500 + 375 = 1,875
      cy.getByCy('supplier-invoice-total-with-vat').should('contain', '1,875.00');

      // Remove second item
      cy.getByCy('remove-line-item-btn-1').click();

      // Total should now be 1,000 + 250 = 1,250
      cy.getByCy('supplier-invoice-total-with-vat').should('contain', '1,250.00');
    });

    it('is expected to edit a draft supplier invoice', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('PATCH', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [{ ...mockInvoice, description: 'Updated description' }]
      }).as('updateSupplierInvoice');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('edit-supplier-invoice-1').click();
      cy.getByCy('supplier-invoice-description-input').clear().type('Updated description');
      cy.getByCy('save-supplier-invoice-btn').click();

      cy.wait('@updateSupplierInvoice');
      cy.contains('Supplier invoice updated successfully').should('be.visible');
    });

    it('is expected to approve a supplier invoice and create journal entry', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('POST', '**/rpc/approve_supplier_invoice', {
        statusCode: 200,
        body: { success: true, journal_entry_id: 100 }
      }).as('approveInvoice');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('approve-supplier-invoice-btn-1').click();
      cy.getByCy('confirm-action-button').click();

      cy.wait('@approveInvoice');
      cy.contains('Supplier invoice approved successfully').should('be.visible');
    });

    it('is expected to mark a supplier invoice as paid', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'approved',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('POST', '**/rpc/mark_supplier_invoice_paid', {
        statusCode: 200,
        body: { success: true }
      }).as('markPaid');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('mark-paid-supplier-invoice-1').click();
      cy.getByCy('confirm-action-button').click();

      cy.wait('@markPaid');
      cy.contains('Supplier invoice marked as paid').should('be.visible');
    });

    it('is expected to cancel a supplier invoice', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('POST', '**/rpc/cancel_supplier_invoice', {
        statusCode: 200,
        body: { success: true }
      }).as('cancelInvoice');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('cancel-supplier-invoice-1').click();
      cy.getByCy('confirm-action-button').click();

      cy.wait('@cancelInvoice');
      cy.contains('Supplier invoice cancelled').should('be.visible');
    });

    it('is expected to delete a draft supplier invoice', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('DELETE', '**/rest/v1/supplier_invoices?id=eq.1', {
        statusCode: 204
      }).as('deleteSupplierInvoice');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('delete-supplier-invoice-1').click();
      cy.getByCy('confirm-action-button').click();

      cy.wait('@deleteSupplierInvoice');
      cy.contains('Supplier invoice deleted successfully').should('be.visible');
    });

    it('is expected to filter supplier invoices by status', () => {
      const mockInvoices = [
        { id: 1, status: 'draft', invoice_number: 'SUP-001', supplier_id: 1, organization_id: 1, invoice_date: '2024-01-15', due_date: '2024-02-14', total_with_vat: 1250 },
        { id: 2, status: 'approved', invoice_number: 'SUP-002', supplier_id: 1, organization_id: 1, invoice_date: '2024-01-16', due_date: '2024-02-15', total_with_vat: 2500 },
        { id: 3, status: 'paid', invoice_number: 'SUP-003', supplier_id: 1, organization_id: 1, invoice_date: '2024-01-17', due_date: '2024-02-16', total_with_vat: 3750 }
      ];

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: mockInvoices
      }).as('getSupplierInvoices');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      // All invoices visible
      cy.contains('SUP-001').should('be.visible');
      cy.contains('SUP-002').should('be.visible');
      cy.contains('SUP-003').should('be.visible');

      // Filter by draft
      cy.getByCy('status-filter-select').select('draft');
      cy.contains('SUP-001').should('be.visible');
      cy.contains('SUP-002').should('not.exist');
      cy.contains('SUP-003').should('not.exist');

      // Filter by approved
      cy.getByCy('status-filter-select').select('approved');
      cy.contains('SUP-001').should('not.exist');
      cy.contains('SUP-002').should('be.visible');
      cy.contains('SUP-003').should('not.exist');

      // Filter by paid
      cy.getByCy('status-filter-select').select('paid');
      cy.contains('SUP-001').should('not.exist');
      cy.contains('SUP-002').should('not.exist');
      cy.contains('SUP-003').should('be.visible');
    });

    it('is expected to search supplier invoices by invoice number', () => {
      const mockInvoices = [
        { id: 1, status: 'draft', invoice_number: 'SUP-001', supplier_id: 1, organization_id: 1, invoice_date: '2024-01-15', due_date: '2024-02-14', total_with_vat: 1250, description: 'Office supplies' },
        { id: 2, status: 'draft', invoice_number: 'SUP-002', supplier_id: 1, organization_id: 1, invoice_date: '2024-01-16', due_date: '2024-02-15', total_with_vat: 2500, description: 'Cleaning materials' }
      ];

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: mockInvoices
      }).as('getSupplierInvoices');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('search-supplier-invoices-input').type('SUP-001');
      cy.contains('SUP-001').should('be.visible');
      cy.contains('SUP-002').should('not.exist');
    });

    it('is expected to display empty state when no supplier invoices exist', () => {
      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: []
      }).as('getSupplierInvoices');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.contains('No supplier invoices found').should('be.visible');
      cy.getByCy('create-first-supplier-invoice-button').should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to display validation error when required fields are missing', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      // Try to save without filling required fields
      cy.getByCy('save-supplier-invoice-btn').click();

      cy.contains('Please select a supplier').should('be.visible');
      cy.contains('Invoice number is required').should('be.visible');
      cy.contains('Invoice date is required').should('be.visible');
    });

    it('is expected to display error when API call fails during creation', () => {
      cy.intercept('POST', '**/rest/v1/supplier_invoices*', {
        statusCode: 500,
        body: { message: 'Database error' }
      }).as('createSupplierInvoiceFail');

      cy.visit('/supplier-invoices');
      cy.getByCy('add-supplier-invoice-btn').click();

      cy.getByCy('supplier-invoice-supplier-select').select('Test Supplier AB');
      cy.getByCy('supplier-invoice-number-input').type('SUP-001');
      cy.getByCy('supplier-invoice-date-input').type('2024-01-15');
      cy.getByCy('supplier-invoice-description-input').type('Test');

      cy.getByCy('supplier-invoice-line-description-0').type('Item');
      cy.getByCy('supplier-invoice-line-account-0').select('4010 - Office Supplies');
      cy.getByCy('supplier-invoice-line-quantity-0').clear().type('1');
      cy.getByCy('supplier-invoice-line-price-0').clear().type('100');

      cy.getByCy('save-supplier-invoice-btn').click();
      cy.wait('@createSupplierInvoiceFail');

      cy.contains('Failed to create supplier invoice').should('be.visible');
    });

    it('is expected to display error when trying to approve invoice with invalid fiscal year', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('POST', '**/rpc/approve_supplier_invoice', {
        statusCode: 400,
        body: { message: 'No active fiscal year for invoice date' }
      }).as('approveInvoiceFail');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('approve-supplier-invoice-btn-1').click();
      cy.getByCy('confirm-approve-btn').click();

      cy.wait('@approveInvoiceFail');
      cy.contains('Failed to approve supplier invoice').should('be.visible');
    });

    it('is expected to display error when deleting an approved invoice', () => {
      const mockInvoice = {
        id: 1,
        organization_id: 1,
        supplier_id: 1,
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'approved',
        total_amount: 1000,
        total_vat: 250,
        total_with_vat: 1250,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      // Delete button should not be visible for approved invoices
      cy.getByCy('delete-supplier-invoice-1').should('not.exist');
    });

    it('is expected to require at least one line item', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-invoice-supplier-select').select('Test Supplier AB');
      cy.getByCy('supplier-invoice-number-input').type('SUP-001');
      cy.getByCy('supplier-invoice-date-input').type('2024-01-15');

      // Remove the default line item
      cy.getByCy('remove-line-item-btn-0').click();

      cy.getByCy('save-supplier-invoice-btn').click();
      cy.contains('At least one line item is required').should('be.visible');
    });

    it('is expected to validate line item fields', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-invoice-supplier-select').select('Test Supplier AB');
      cy.getByCy('supplier-invoice-number-input').type('SUP-001');
      cy.getByCy('supplier-invoice-date-input').type('2024-01-15');

      // Leave line item fields empty
      cy.getByCy('save-supplier-invoice-btn').click();

      cy.contains('Description is required for all line items').should('be.visible');
      cy.contains('Account is required for all line items').should('be.visible');
    });
  });
});
