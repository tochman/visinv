describe('Supplier Invoices', () => {
  const mockSuppliers = [
    {
      id: 'supplier-uuid-1',
      organization_id: 'test-org-id',
      name: 'Test Supplier AB',
      organization_number: '556789-1234',
      default_payment_terms_days: 30,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }
  ];

  const mockAccounts = [
    { id: 'acc-1', account_number: '4010', name: 'Office Supplies', account_name: 'Office Supplies', organization_id: 'test-org-id', account_type: 'expense', is_active: true },
    { id: 'acc-2', account_number: '5010', name: 'Rent', account_name: 'Rent', organization_id: 'test-org-id', account_type: 'expense', is_active: true },
    { id: 'acc-3', account_number: '2640', name: 'VAT Receivable', account_name: 'VAT Receivable', organization_id: 'test-org-id', account_type: 'asset', is_active: true },
    { id: 'acc-4', account_number: '2440', name: 'Accounts Payable', account_name: 'Accounts Payable', organization_id: 'test-org-id', account_type: 'liability', is_active: true }
  ];

  const mockFiscalYears = [
    { id: 'fy-1', organization_id: 'test-org-id', year: 2024, start_date: '2024-01-01', end_date: '2024-12-31', is_locked: false }
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
      statusCode: 200,
      body: []
    }).as('getSupplierInvoices');

    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: mockFiscalYears
    }).as('getFiscalYears');

    cy.setupCommonIntercepts({ 
      clients: [],
      products: [],
      invoices: [],
      suppliers: mockSuppliers,
      accounts: mockAccounts
    });
    
    cy.login('admin');
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display the supplier invoices page', () => {
      cy.getByCy('sidebar-nav-supplier-invoices').click();
      cy.url().should('include', '/supplier-invoices');
      cy.getByCy('supplier-invoices-page-title').should('be.visible');
    });

    it('is expected to create a new supplier invoice with line items', () => {
      cy.intercept('POST', '**/rest/v1/supplier_invoices*', {
        statusCode: 201,
        body: [{
          id: 'inv-1',
          organization_id: 'test-org-id',
          supplier_id: 'supplier-uuid-1',
          invoice_number: 'SUP-001',
          invoice_date: '2024-01-15',
          due_date: '2024-02-14',
          description: 'Office supplies purchase',
          status: 'draft',
          total_amount: 1000,
          total_vat: 250,
          currency: 'SEK',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        }]
      }).as('createSupplierInvoice');

      cy.intercept('POST', '**/rest/v1/supplier_invoice_lines*', {
        statusCode: 201,
        body: [{
          id: 'line-1',
          supplier_invoice_id: 'inv-1',
          description: 'Paper and pens',
          account_id: 'acc-1',
          quantity: 10,
          unit_price: 100,
          amount: 1000,
          vat_rate: 25,
          vat_amount: 250
        }]
      }).as('createSupplierInvoiceLines');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      
      cy.getByCy('create-supplier-invoice-button').click();
      cy.getByCy('supplier-invoice-modal').should('be.visible');
      
      // Fill out the form
      cy.getByCy('supplier-select').select('Test Supplier AB');
      cy.getByCy('invoice-number-input').type('SUP-001');
      cy.getByCy('invoice-date-input').type('2024-01-15');
      cy.getByCy('description-input').type('Office supplies purchase');

      // Fill line item - wait for options to be available
      cy.getByCy('line-account-0').find('option').should('have.length.gt', 1);
      cy.getByCy('line-account-0').select('4010 - Office Supplies');
      cy.getByCy('line-description-0').type('Paper and pens');
      cy.getByCy('line-quantity-0').clear().type('10');
      cy.getByCy('line-unit-price-0').clear().type('100');

      cy.getByCy('submit-button').click();
      
      cy.wait('@createSupplierInvoice');
    });

    it('is expected to add multiple line items and calculate totals correctly', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-select').select('Test Supplier AB');
      cy.getByCy('invoice-number-input').type('SUP-002');
      cy.getByCy('invoice-date-input').type('2024-01-15');

      // First line item - wait for options to load
      cy.getByCy('line-account-0').find('option').should('have.length.gt', 1);
      cy.getByCy('line-account-0').select('4010 - Office Supplies');
      cy.getByCy('line-description-0').type('Paper');
      cy.getByCy('line-quantity-0').clear().type('5');
      cy.getByCy('line-unit-price-0').clear().type('100');

      // Add second line item
      cy.getByCy('add-line-button').click();
      cy.getByCy('line-account-1').select('4010 - Office Supplies');
      cy.getByCy('line-description-1').type('Pens');
      cy.getByCy('line-quantity-1').clear().type('10');
      cy.getByCy('line-unit-price-1').clear().type('50');

      // Verify calculations displayed
      cy.getByCy('subtotal-display').should('exist');
      cy.getByCy('total-display').should('exist');
    });

    it('is expected to remove a line item', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-select').select('Test Supplier AB');
      cy.getByCy('invoice-number-input').type('SUP-003');
      cy.getByCy('invoice-date-input').type('2024-01-15');

      // First line item - wait for options to load
      cy.getByCy('line-account-0').find('option').should('have.length.gt', 1);
      cy.getByCy('line-account-0').select('4010 - Office Supplies');
      cy.getByCy('line-quantity-0').clear().type('1');
      cy.getByCy('line-unit-price-0').clear().type('1000');

      // Add second line item
      cy.getByCy('add-line-button').click();
      cy.getByCy('line-account-1').select('4010 - Office Supplies');
      cy.getByCy('line-quantity-1').clear().type('1');
      cy.getByCy('line-unit-price-1').clear().type('500');

      // Verify 2 lines exist
      cy.getByCy('line-item-0').should('exist');
      cy.getByCy('line-item-1').should('exist');

      // Remove second item
      cy.getByCy('remove-line-1').click();

      // Now only 1 line should exist
      cy.getByCy('line-item-1').should('not.exist');
    });

    it('is expected to edit a draft supplier invoice', () => {
      const mockInvoice = {
        id: 'inv-1',
        organization_id: 'test-org-id',
        supplier_id: 'supplier-uuid-1',
        supplier: mockSuppliers[0],
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        currency: 'SEK',
        lines: [{ id: 'line-1', account_id: 'acc-1', description: 'Item', quantity: 1, unit_price: 1000, amount: 1000, vat_rate: 25, vat_amount: 250, line_order: 1 }]
      };

      // Intercept single invoice fetch (show) with Prefer: return=representation header
      cy.intercept('GET', '**/rest/v1/supplier_invoices*', (req) => {
        if (req.url.includes('id=eq.inv-1')) {
          // Single item request
          req.reply({
            statusCode: 200,
            body: mockInvoice,
            headers: {
              'Content-Range': '0-0/1'
            }
          });
        } else {
          // List request
          req.reply({
            statusCode: 200,
            body: [mockInvoice]
          });
        }
      }).as('getSupplierInvoices');

      // Intercept PATCH for update
      cy.intercept('PATCH', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: { ...mockInvoice, description: 'Updated description' }
      }).as('updateSupplierInvoice');

      // Intercept DELETE for lines during update
      cy.intercept('DELETE', '**/rest/v1/supplier_invoice_lines*', {
        statusCode: 204,
        body: null
      }).as('deleteLines');

      // Intercept POST for lines during update
      cy.intercept('POST', '**/rest/v1/supplier_invoice_lines*', {
        statusCode: 201,
        body: [{ ...mockInvoice.lines[0] }]
      }).as('createLines');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('edit-supplier-invoice-inv-1').click();
      cy.getByCy('supplier-invoice-modal').should('be.visible');
      cy.getByCy('description-input').clear().type('Updated description');
      cy.getByCy('submit-button').click();

      cy.wait('@updateSupplierInvoice');
    });

    it('is expected to approve a supplier invoice', () => {
      const mockInvoice = {
        id: 'inv-1',
        organization_id: 'test-org-id',
        supplier_id: 'supplier-uuid-1',
        supplier: mockSuppliers[0],
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        currency: 'SEK'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('PATCH', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [{ ...mockInvoice, status: 'approved' }]
      }).as('approveInvoice');

      cy.intercept('POST', '**/rest/v1/journal_entries*', {
        statusCode: 201,
        body: [{ id: 'je-1' }]
      }).as('createJournalEntry');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('approve-supplier-invoice-inv-1').click();
      cy.getByCy('confirm-action-button').click();
    });

    it('is expected to mark a supplier invoice as paid', () => {
      const mockInvoice = {
        id: 'inv-1',
        organization_id: 'test-org-id',
        supplier_id: 'supplier-uuid-1',
        supplier: mockSuppliers[0],
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'approved',
        total_amount: 1000,
        total_vat: 250,
        currency: 'SEK'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('PATCH', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [{ ...mockInvoice, status: 'paid' }]
      }).as('markPaid');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('mark-paid-supplier-invoice-inv-1').click();
      cy.getByCy('confirm-action-button').click();
    });

    it('is expected to cancel a supplier invoice', () => {
      const mockInvoice = {
        id: 'inv-1',
        organization_id: 'test-org-id',
        supplier_id: 'supplier-uuid-1',
        supplier: mockSuppliers[0],
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'approved',
        total_amount: 1000,
        total_vat: 250,
        currency: 'SEK'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('PATCH', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [{ ...mockInvoice, status: 'cancelled' }]
      }).as('cancelInvoice');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('cancel-supplier-invoice-inv-1').click();
      cy.getByCy('confirm-action-button').click();
    });

    it('is expected to delete a draft supplier invoice', () => {
      const mockInvoice = {
        id: 'inv-1',
        organization_id: 'test-org-id',
        supplier_id: 'supplier-uuid-1',
        supplier: mockSuppliers[0],
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'draft',
        total_amount: 1000,
        total_vat: 250,
        currency: 'SEK'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.intercept('DELETE', '**/rest/v1/supplier_invoices*', {
        statusCode: 204,
        body: null
      }).as('deleteSupplierInvoice');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      cy.getByCy('delete-supplier-invoice-inv-1').click();
      cy.getByCy('confirm-action-button').click();

      cy.wait('@deleteSupplierInvoice');
    });

    it('is expected to filter supplier invoices by status', () => {
      const mockInvoices = [
        { id: 'inv-1', status: 'draft', invoice_number: 'SUP-001', supplier_id: 'supplier-uuid-1', supplier: mockSuppliers[0], organization_id: 'test-org-id', invoice_date: '2024-01-15', due_date: '2024-02-14', total_amount: 1000, currency: 'SEK' },
        { id: 'inv-2', status: 'approved', invoice_number: 'SUP-002', supplier_id: 'supplier-uuid-1', supplier: mockSuppliers[0], organization_id: 'test-org-id', invoice_date: '2024-01-16', due_date: '2024-02-15', total_amount: 2000, currency: 'SEK' },
        { id: 'inv-3', status: 'paid', invoice_number: 'SUP-003', supplier_id: 'supplier-uuid-1', supplier: mockSuppliers[0], organization_id: 'test-org-id', invoice_date: '2024-01-17', due_date: '2024-02-16', total_amount: 3000, currency: 'SEK' }
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
    });

    it('is expected to search supplier invoices by invoice number', () => {
      const mockInvoices = [
        { id: 'inv-1', status: 'draft', invoice_number: 'SUP-001', supplier_id: 'supplier-uuid-1', supplier: mockSuppliers[0], organization_id: 'test-org-id', invoice_date: '2024-01-15', due_date: '2024-02-14', total_amount: 1000, currency: 'SEK', description: 'Office supplies' },
        { id: 'inv-2', status: 'draft', invoice_number: 'SUP-002', supplier_id: 'supplier-uuid-1', supplier: mockSuppliers[0], organization_id: 'test-org-id', invoice_date: '2024-01-16', due_date: '2024-02-15', total_amount: 2000, currency: 'SEK', description: 'Cleaning materials' }
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

      cy.getByCy('supplier-invoices-empty-state').should('be.visible');
      cy.getByCy('create-first-supplier-invoice-button').should('be.visible');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to display validation error when supplier is not selected', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('invoice-number-input').type('SUP-001');
      cy.getByCy('invoice-date-input').type('2024-01-15');
      cy.getByCy('due-date-input').type('2024-02-14');
      cy.getByCy('line-account-0').select('4010 - Office Supplies');

      cy.getByCy('submit-button').click();

      cy.getByCy('supplier-invoice-form-error').should('exist').and('contain', 'Supplier');
    });

    it('is expected to display validation error when invoice number is missing', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-select').select('Test Supplier AB');
      cy.getByCy('invoice-date-input').type('2024-01-15');
      cy.getByCy('due-date-input').type('2024-02-14');
      cy.getByCy('line-account-0').select('4010 - Office Supplies');

      cy.getByCy('submit-button').click();

      cy.getByCy('supplier-invoice-form-error').should('exist').and('contain', 'Invoice number');
    });

    it('is expected to display validation error when no line items have accounts', () => {
      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');
      cy.getByCy('create-supplier-invoice-button').click();

      cy.getByCy('supplier-select').select('Test Supplier AB');
      cy.getByCy('invoice-number-input').type('SUP-001');
      cy.getByCy('invoice-date-input').type('2024-01-15');
      cy.getByCy('due-date-input').type('2024-02-14');
      // Don't select an account for the line item

      cy.getByCy('submit-button').click();

      cy.getByCy('supplier-invoice-form-error').should('exist').and('contain', 'line item');
    });

    it('is expected to not show delete button for approved invoices', () => {
      const mockInvoice = {
        id: 'inv-1',
        organization_id: 'test-org-id',
        supplier_id: 'supplier-uuid-1',
        supplier: mockSuppliers[0],
        invoice_number: 'SUP-001',
        invoice_date: '2024-01-15',
        due_date: '2024-02-14',
        description: 'Office supplies',
        status: 'approved',
        total_amount: 1000,
        total_vat: 250,
        currency: 'SEK'
      };

      cy.intercept('GET', '**/rest/v1/supplier_invoices*', {
        statusCode: 200,
        body: [mockInvoice]
      }).as('getSupplierInvoices');

      cy.visit('/supplier-invoices');
      cy.wait('@getSupplierInvoices');

      // Delete button should not be visible for approved invoices
      cy.getByCy('delete-supplier-invoice-inv-1').should('not.exist');
    });
  });
});
