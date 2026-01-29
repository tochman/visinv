/**
 * Supplier Management Tests - US-261
 * Tests CRUD operations for suppliers/vendors
 */

describe('Suppliers', () => {
  beforeEach(() => {
    // Setup common intercepts and login
    cy.setupCommonIntercepts({
      accounts: [
        { id: 'acc1', account_number: 2440, name: 'Leverantörsskulder', account_type: 'liability' },
        { id: 'acc2', account_number: 4000, name: 'Inköp varor', account_type: 'expense' },
        { id: 'acc3', account_number: 5010, name: 'Lokalhyra', account_type: 'expense' },
      ],
      suppliers: [], // Add empty suppliers to setupCommonIntercepts
    });
    cy.login('admin');
    cy.wait('@getClients'); // Wait for initial load to complete
    
    // Visit suppliers page
    cy.visit('/suppliers');
    cy.wait('@getSuppliers');
  });

  describe('Happy Path - Success Scenarios', () => {
    it('is expected to display empty state when no suppliers exist', () => {
      cy.getByCy('suppliers-page-title').should('contain', 'Suppliers');
      cy.getByCy('suppliers-empty-state').should('be.visible');
      cy.getByCy('create-first-supplier-button').should('be.visible');
    });

    it('is expected to create a new supplier successfully', () => {
      // Intercept supplier creation
      cy.intercept('POST', '**/rest/v1/suppliers', {
        statusCode: 201,
        body: [{
          id: 'supplier-1',
          organization_id: 'org-123',
          name: 'Acme Supplies AB',
          email: 'info@acme.se',
          phone: '+46 8 123 456',
          organization_number: '556123-4567',
          vat_number: 'SE556123456701',
          is_active: true,
          default_payment_terms_days: 30,
          currency: 'SEK',
          created_at: new Date().toISOString(),
        }],
      }).as('createSupplier');

      // Intercept updated suppliers list
      cy.intercept('GET', '**/rest/v1/suppliers*', {
        statusCode: 200,
        body: [{
          id: 'supplier-1',
          organization_id: 'org-123',
          name: 'Acme Supplies AB',
          email: 'info@acme.se',
          phone: '+46 8 123 456',
          organization_number: '556123-4567',
          vat_number: 'SE556123456701',
          is_active: true,
          default_payment_terms_days: 30,
          currency: 'SEK',
          created_at: new Date().toISOString(),
        }],
      }).as('getSuppliersAfterCreate');

      // Click create button
      cy.getByCy('create-supplier-button').click();
      cy.getByCy('supplier-modal').should('be.visible');
      cy.getByCy('supplier-modal-title').should('contain', 'Add Supplier');

      // Fill in supplier form
      cy.getByCy('supplier-name-input').type('Acme Supplies AB');
      cy.getByCy('supplier-email-input').type('info@acme.se');
      cy.getByCy('supplier-phone-input').type('+46 8 123 456');
      cy.getByCy('supplier-org-number-input').type('556123-4567');
      cy.getByCy('supplier-vat-number-input').type('SE556123456701');

      // Submit form
      cy.getByCy('submit-button').click();
      cy.wait('@createSupplier');
      cy.wait('@getSuppliersAfterCreate');

      // Verify modal closes and supplier appears in list
      cy.getByCy('supplier-modal').should('not.exist');
      cy.getByCy('supplier-row-supplier-1').should('be.visible');
      cy.getByCy('supplier-row-supplier-1').should('contain', 'Acme Supplies AB');
      cy.getByCy('supplier-row-supplier-1').should('contain', 'info@acme.se');
    });

    it('is expected to edit an existing supplier successfully', () => {
      // Setup initial suppliers list
      cy.intercept('GET', '**/rest/v1/suppliers*', {
        statusCode: 200,
        body: [{
          id: 'supplier-1',
          organization_id: 'org-123',
          name: 'Acme Supplies AB',
          email: 'info@acme.se',
          phone: '+46 8 123 456',
          organization_number: '556123-4567',
          is_active: true,
          default_payment_terms_days: 30,
          currency: 'SEK',
        }],
      }).as('getInitialSuppliers');

      cy.reload();
      cy.wait('@getInitialSuppliers');

      // Intercept supplier update
      cy.intercept('PATCH', '**/rest/v1/suppliers?id=eq.supplier-1', {
        statusCode: 200,
        body: [{
          id: 'supplier-1',
          organization_id: 'org-123',
          name: 'Acme Supplies AB Updated',
          email: 'new@acme.se',
          phone: '+46 8 999 888',
          organization_number: '556123-4567',
          is_active: true,
          default_payment_terms_days: 45,
          currency: 'SEK',
        }],
      }).as('updateSupplier');

      // Click edit button
      cy.getByCy('edit-supplier-supplier-1').click();
      cy.getByCy('supplier-modal').should('be.visible');
      cy.getByCy('supplier-modal-title').should('contain', 'Edit Supplier');

      // Modify fields
      cy.getByCy('supplier-name-input').clear().type('Acme Supplies AB Updated');
      cy.getByCy('supplier-email-input').clear().type('new@acme.se');
      cy.getByCy('supplier-phone-input').clear().type('+46 8 999 888');

      // Submit
      cy.getByCy('submit-button').click();
      cy.wait('@updateSupplier');

      // Verify changes
      cy.getByCy('supplier-modal').should('not.exist');
    });

    it('is expected to delete a supplier successfully', () => {
      // Setup initial suppliers list
      cy.intercept('GET', '**/rest/v1/suppliers*', {
        statusCode: 200,
        body: [{
          id: 'supplier-1',
          organization_id: 'org-123',
          name: 'Acme Supplies AB',
          email: 'info@acme.se',
          is_active: true,
        }],
      }).as('getInitialSuppliers');

      cy.reload();
      cy.wait('@getInitialSuppliers');

      // Intercept delete
      cy.intercept('DELETE', '**/rest/v1/suppliers?id=eq.supplier-1', {
        statusCode: 204,
      }).as('deleteSupplier');

      // Intercept updated list (empty)
      cy.intercept('GET', '**/rest/v1/suppliers*', {
        statusCode: 200,
        body: [],
      }).as('getSuppliersAfterDelete');

      // Click delete button
      cy.getByCy('delete-supplier-supplier-1').click();
      cy.getByCy('delete-confirm-modal').should('be.visible');

      // Confirm deletion
      cy.getByCy('confirm-delete-button').click();
      cy.wait('@deleteSupplier');
      cy.wait('@getSuppliersAfterDelete');

      // Verify supplier is removed
      cy.getByCy('delete-confirm-modal').should('not.exist');
      cy.getByCy('supplier-row-supplier-1').should('not.exist');
      cy.getByCy('suppliers-empty-state').should('be.visible');
    });

    it('is expected to search suppliers by name, email, or org number', () => {
      // Setup suppliers list
      cy.intercept('GET', '**/rest/v1/suppliers*', {
        statusCode: 200,
        body: [
          {
            id: 'supplier-1',
            name: 'Acme Supplies AB',
            email: 'info@acme.se',
            organization_number: '556123-4567',
            is_active: true,
          },
          {
            id: 'supplier-2',
            name: 'Beta Corp',
            email: 'contact@beta.se',
            organization_number: '559876-5432',
            is_active: true,
          },
        ],
      }).as('getSuppliers');

      cy.reload();
      cy.wait('@getSuppliers');

      // Search by name
      cy.getByCy('search-suppliers-input').type('Acme');
      cy.getByCy('supplier-row-supplier-1').should('be.visible');
      cy.getByCy('supplier-row-supplier-2').should('not.exist');

      // Clear and search by org number
      cy.getByCy('search-suppliers-input').clear().type('559876');
      cy.getByCy('supplier-row-supplier-1').should('not.exist');
      cy.getByCy('supplier-row-supplier-2').should('be.visible');

      // Clear and verify all shown
      cy.getByCy('search-suppliers-input').clear();
      cy.getByCy('supplier-row-supplier-1').should('be.visible');
      cy.getByCy('supplier-row-supplier-2').should('be.visible');
    });

    it('is expected to filter active and inactive suppliers', () => {
      // Setup suppliers with active/inactive
      cy.intercept('GET', '**/rest/v1/suppliers*is_active=eq.true*', {
        statusCode: 200,
        body: [{
          id: 'supplier-1',
          name: 'Active Supplier',
          is_active: true,
        }],
      }).as('getActiveSuppliers');

      cy.intercept('GET', '**/rest/v1/suppliers?*', {
        statusCode: 200,
        body: [
          {
            id: 'supplier-1',
            name: 'Active Supplier',
            is_active: true,
          },
          {
            id: 'supplier-2',
            name: 'Inactive Supplier',
            is_active: false,
          },
        ],
      }).as('getAllSuppliers');

      cy.reload();
      cy.wait('@getActiveSuppliers');

      // By default, only active suppliers shown
      cy.getByCy('supplier-row-supplier-1').should('exist');
      cy.getByCy('supplier-row-supplier-2').should('not.exist');

      // Show inactive
      cy.getByCy('show-inactive-checkbox').check();
      cy.wait('@getAllSuppliers');
      cy.getByCy('supplier-row-supplier-1').should('exist');
      cy.getByCy('supplier-row-supplier-2').should('exist');
    });
  });

  describe('Sad Path - Error Scenarios', () => {
    it('is expected to display error when supplier name is empty', () => {
      cy.getByCy('create-supplier-button').click();
      cy.getByCy('supplier-modal').should('be.visible');

      // Try to submit without name
      cy.getByCy('submit-button').click();

      // HTML5 validation should prevent submission
      cy.getByCy('supplier-name-input').then($input => {
        expect($input[0].validity.valid).to.be.false;
      });
    });

    it('is expected to display error message when API fails', () => {
      // Intercept with error
      cy.intercept('POST', '**/rest/v1/suppliers', {
        statusCode: 500,
        body: { message: 'Internal Server Error' },
      }).as('createSupplierError');

      cy.getByCy('create-supplier-button').click();
      cy.getByCy('supplier-name-input').type('Test Supplier');
      cy.getByCy('submit-button').click();

      cy.wait('@createSupplierError');
      cy.getByCy('supplier-form-error').should('be.visible');
    });

    it('is expected to handle cancel button in delete confirmation', () => {
      // Setup initial supplier
      cy.intercept('GET', '**/rest/v1/suppliers*', {
        statusCode: 200,
        body: [{
          id: 'supplier-1',
          name: 'Acme Supplies AB',
          is_active: true,
        }],
      }).as('getSuppliers');

      cy.reload();
      cy.wait('@getSuppliers');

      // Click delete
      cy.getByCy('delete-supplier-supplier-1').click();
      cy.getByCy('delete-confirm-modal').should('be.visible');

      // Cancel deletion
      cy.getByCy('cancel-delete-button').click();
      cy.getByCy('delete-confirm-modal').should('not.exist');

      // Verify supplier still exists
      cy.getByCy('supplier-row-supplier-1').should('exist');
    });
  });
});
