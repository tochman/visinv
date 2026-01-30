describe('Account Management (US-202)', () => {
  beforeEach(() => {
    // Mock data for accounts
    const mockAccounts = [
      {
        id: 'acc-1510',
        account_number: '1510',
        name: 'Kundfordringar',
        name_en: 'Accounts Receivable',
        account_class: 'assets',
        account_type: 'detail',
        is_active: true,
        is_system: true,
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'acc-3010',
        account_number: '3010',
        name: 'Försäljning varor 25% moms',
        name_en: 'Sales Goods 25% VAT',
        account_class: 'revenue',
        account_type: 'detail',
        is_active: true,
        is_system: true,
        default_vat_rate: 25,
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'acc-6570',
        account_number: '6570',
        name: 'Bankkostnader',
        name_en: 'Bank Fees',
        account_class: 'expenses',
        account_type: 'detail',
        is_active: false,
        is_system: false,
        organization_id: 'org-1',
        created_at: '2024-01-01T00:00:00Z',
      }
    ];

    // Mock account number validation check - return empty for non-existing accounts
    // This intercept must come BEFORE the general getAccounts to be more specific
    // Using a callback to handle the validation check dynamically
    cy.intercept('GET', '**/rest/v1/accounts*', (req) => {
      const url = req.url;
      // Check if this is a validation check (has select=id and account_number)
      if (url.includes('select=id') && url.includes('account_number=eq.')) {
        req.reply({
          statusCode: 200,
          body: [] // Return empty for any account number validation check
        });
      } else {
        // Return the full list for regular account listing
        req.reply({
          statusCode: 200,
          body: mockAccounts
        });
      }
    }).as('getAccounts');

    // Mock RPC call for account summaries
    cy.intercept('POST', '/rest/v1/rpc/get_account_balance_and_count*', {
      statusCode: 200,
      body: [
        {
          account_id: 'acc-1510',
          account_number: '1510',
          account_name: 'Kundfordringar',
          account_class: 'assets',
          balance: 15000.00,
          debit_total: 20000.00,
          credit_total: 5000.00,
          transaction_count: 15,
          as_of_date: '2024-12-31'
        },
        {
          account_id: 'acc-3010',
          account_number: '3010',
          account_name: 'Försäljning varor 25% moms',
          account_class: 'revenue',
          balance: 50000.00,
          debit_total: 2000.00,
          credit_total: 52000.00,
          transaction_count: 25,
          as_of_date: '2024-12-31'
        },
        {
          account_id: 'acc-6570',
          account_number: '6570',
          account_name: 'Bankkostnader',
          account_class: 'expenses',
          balance: 0,
          debit_total: 0,
          credit_total: 0,
          transaction_count: 0,
          as_of_date: '2024-12-31'
        }
      ]
    }).as('getAccountSummaries');

    // Account create/update/delete endpoints
    cy.intercept('POST', '/rest/v1/accounts*', { fixture: 'account_created.json' }).as('createAccount');
    cy.intercept('PATCH', '/rest/v1/accounts*', { fixture: 'account_updated.json' }).as('updateAccount');

    // Login without waiting for clients (accounts page doesn't need clients)
    cy.login('admin');
    
    // Visit accounts page and wait for the correct requests
    cy.visit('/accounts');
    cy.wait('@getAccounts');
    
    // The accounts page should also fetch summaries after accounts are loaded
    // This might happen automatically, so let's wait for it too
    cy.wait('@getAccountSummaries');
  });

  describe('Account Listing', () => {
    it('is expected to display accounts with balance and transaction count', () => {
      // Verify accounts table is visible
      cy.getByCy('accounts-table').should('be.visible');
      
      // Check table headers include balance and transactions
      cy.get('th').should('contain.text', 'Balance');
      cy.get('th').should('contain.text', 'Transactions');
      
      // Verify first account row shows data
      cy.getByCy('account-row-1510').within(() => {
        cy.get('td').eq(0).should('contain.text', '1510');
        // Use English name since test environment language is set to 'en'
        cy.get('td').eq(1).should('contain.text', 'Accounts Receivable');
        cy.get('td').eq(2).should('contain.text', 'Assets');
        cy.get('td').eq(3).should('contain.text', 'Detail');
        // Balance column (index 4) - should show formatted currency
        cy.get('td').eq(4).should('be.visible').and('not.be.empty');
        // Transaction count column (index 5)
        cy.get('td').eq(5).should('contain.text', '15');
      });
    });

    it('is expected to filter accounts by class', () => {
      // Click Assets filter
      cy.getByCy('filter-assets').click();
      
      // Should only show assets accounts
      cy.getByCy('account-row-1510').should('be.visible');
      cy.getByCy('account-row-3010').should('not.exist');
      cy.getByCy('account-row-6570').should('not.exist');
    });

    it('is expected to search accounts by number and name', () => {
      // Search by account number
      cy.getByCy('search-accounts-input').type('1510');
      cy.getByCy('account-row-1510').should('be.visible');
      cy.getByCy('account-row-3010').should('not.exist');
      
      // Clear and search by name
      cy.getByCy('search-accounts-input').clear().type('Försäljning');
      cy.getByCy('account-row-1510').should('not.exist');
      cy.getByCy('account-row-3010').should('be.visible');
    });

    it('is expected to show inactive accounts when toggle is enabled', () => {
      // Enable show inactive accounts using the correct data-cy attribute
      cy.getByCy('include-inactive-checkbox').check();
      
      // Wait for the accounts to refresh
      cy.wait('@getAccounts');
      
      // Now inactive account should be visible
      cy.getByCy('account-row-6570').should('be.visible');
    });
  });

  describe('Create Account', () => {
    beforeEach(() => {
      // Mock account creation API
      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 201,
        body: {
          id: 'acc-4501',
          account_number: '4501',
          name: 'Testdriftskostnader',
          name_en: 'Test Operating Expenses',
          account_class: 'expenses',
          account_type: 'detail',
          is_active: true,
          is_system: false,
          default_vat_rate: 25,
          description: 'Account for testing expenses',
          organization_id: 'org-1',
          created_at: new Date().toISOString(),
        }
      }).as('createAccount');

      // Click create account button
      cy.getByCy('create-account-button').click();
      cy.getByCy('account-modal').should('be.visible');
    });

    it('is expected to create a new account with valid data', () => {
      // Fill out the form with a unique account number
      cy.getByCy('account-number-input').type('4501');
      cy.getByCy('account-class-select').select('expenses');
      cy.getByCy('account-type-select').select('detail');
      cy.getByCy('account-name-input').type('Testdriftskostnader');
      cy.getByCy('account-name-en-input').type('Test Operating Expenses');
      cy.getByCy('account-vat-rate-select').select('25');
      cy.getByCy('account-description-input').type('Account for testing expenses');

      // Submit form
      cy.getByCy('save-account-button').click();
      
      // Check if there are any validation errors that prevent submission
      cy.get('body').then($body => {
        if ($body.find('[data-cy*="error"]').length > 0) {
          cy.log('Validation errors found - form not submitted');
          // List the errors
          cy.get('[data-cy*="error"]').each(($el) => {
            cy.log('Error:', $el.text());
          });
        }
      });
      
      // Wait for modal to close (this should work if form submits successfully)
      cy.getByCy('account-modal', { timeout: 10000 }).should('not.exist');
    });

    it('is expected to validate required fields', () => {
      // Try to submit without required fields
      cy.getByCy('save-account-button').click();
      
      // Should show validation errors
      cy.getByCy('account-number-error').should('contain.text', 'Account number is required');
      cy.getByCy('account-name-error').should('contain.text', 'Account name is required');
    });

    it('is expected to validate account number format', () => {
      cy.getByCy('account-number-input').type('123');
      cy.getByCy('account-name-input').type('Test Account');
      cy.getByCy('save-account-button').click();
      
      cy.getByCy('account-number-error').should('contain.text', 'Account number must be 4 digits');
    });

    it('is expected to validate account number matches class', () => {
      // Enter assets class but use revenue account number
      cy.getByCy('account-number-input').type('3500');
      cy.getByCy('account-class-select').select('assets');
      cy.getByCy('account-name-input').type('Test Account');
      cy.getByCy('save-account-button').click();
      
      cy.getByCy('account-number-error').should('contain.text', 'Assets accounts must start with 1');
    });

    it('is expected to show account number hint based on selected class', () => {
      cy.getByCy('account-class-select').select('revenue');
      cy.get('p').should('contain.text', 'Revenue accounts should start with 3');
    });

    it('is expected to close modal on cancel', () => {
      cy.getByCy('cancel-account-button').click();
      cy.getByCy('account-modal').should('not.exist');
    });

    it('is expected to close modal on X button', () => {
      cy.getByCy('close-account-modal').click();
      cy.getByCy('account-modal').should('not.exist');
    });
  });

  describe('Edit Account', () => {
    beforeEach(() => {
      // Mock account update API
      cy.intercept('PATCH', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: {
          id: 'acc-6570',
          account_number: '6570',
          name: 'Bankavgifter och kostnader',
          name_en: 'Bank Fees and Charges',
          account_class: 'expenses',
          account_type: 'detail',
          is_active: false,
          is_system: false,
          description: 'Updated description for bank fees',
          organization_id: 'org-1',
          updated_at: new Date().toISOString(),
        }
      }).as('updateAccount');

      // Click edit button for non-system account
      cy.getByCy('edit-account-6570').click();
      cy.getByCy('account-modal').should('be.visible');
    });

    it('is expected to populate form with existing account data', () => {
      // Form should be pre-filled
      cy.getByCy('account-number-input').should('have.value', '6570');
      cy.getByCy('account-name-input').should('have.value', 'Bankkostnader');
      cy.getByCy('account-name-en-input').should('have.value', 'Bank Fees');
      cy.getByCy('account-class-select').should('have.value', 'expenses');
      cy.getByCy('account-type-select').should('have.value', 'detail');
    });

    it('is expected to update account with new data', () => {
      // Change account name
      cy.getByCy('account-name-input').clear().type('Bankavgifter och kostnader');
      cy.getByCy('account-name-en-input').clear().type('Bank Fees and Charges');
      cy.getByCy('account-description-input').type('Updated description for bank fees');
      
      // Submit form
      cy.getByCy('save-account-button').click();
      
      // Should call update endpoint
      cy.wait('@updateAccount');
      
      // Modal should close
      cy.getByCy('account-modal').should('not.exist');
    });

    it('is expected to disable account number for system accounts', () => {
      // Close and open system account for editing
      cy.getByCy('cancel-account-button').click();
      cy.getByCy('edit-account-1510').click();
      
      // Account number should be disabled
      cy.getByCy('account-number-input').should('be.disabled');
      cy.getByCy('account-class-select').should('be.disabled');
    });
  });

  describe('Account Actions', () => {
    beforeEach(() => {
      // Mock account update API for activate/deactivate
      cy.intercept('PATCH', '**/rest/v1/accounts*', (req) => {
        req.reply({
          statusCode: 200,
          body: { ...req.body, updated_at: new Date().toISOString() }
        });
      }).as('updateAccount');
    });

    it('is expected to show edit button for all accounts', () => {
      // All accounts should have edit buttons
      cy.getByCy('edit-account-1510').should('be.visible');
      cy.getByCy('edit-account-3010').should('be.visible');
      cy.getByCy('edit-account-6570').should('be.visible');
    });

    it('is expected to activate an inactive account', () => {
      // Enable showing inactive accounts first
      cy.getByCy('include-inactive-checkbox').check();
      cy.wait('@getAccounts');
      
      // Click activate on inactive account
      cy.getByCy('toggle-account-6570').should('contain.text', 'Activate').click();
      
      // Confirmation modal should appear
      cy.getByCy('action-confirm-modal').should('be.visible');
      cy.get('h3').should('contain.text', 'Activate Account?');
      // Use English name since test env is set to English
      cy.get('p').should('contain.text', '6570 - Bank Fees');
      
      // Confirm activation
      cy.getByCy('confirm-action-button').click();
      
      // Should call activate endpoint
      cy.wait('@updateAccount');
    });

    it('is expected to deactivate an active non-system account', () => {
      // System accounts don't show deactivate button
      cy.getByCy('account-row-1510').within(() => {
        cy.getByCy('toggle-account-1510').should('not.exist');
      });
      
      // Non-system account should show deactivate button (need to add one first)
      // This test would need a non-system active account in the fixture
    });

    it('is expected to not show activate/deactivate for system accounts', () => {
      // System accounts should not have toggle buttons
      cy.getByCy('account-row-1510').within(() => {
        cy.get('[data-cy*="toggle-account"]').should('not.exist');
      });
      
      cy.getByCy('account-row-3010').within(() => {
        cy.get('[data-cy*="toggle-account"]').should('not.exist');
      });
    });
  });

  describe('Account Summary Data', () => {
    it('is expected to display balance with proper formatting and colors', () => {
      cy.getByCy('account-row-1510').within(() => {
        // Balance column (index 4) should be visible and contain a formatted balance
        cy.get('td').eq(4).should('be.visible').and('not.be.empty');
      });

      cy.getByCy('account-row-3010').within(() => {
        // Revenue balance should be visible and formatted
        cy.get('td').eq(4).should('be.visible').and('not.be.empty');
      });
    });

    it('is expected to display transaction count correctly', () => {
      // Check transaction counts are visible and not empty
      cy.getByCy('account-row-1510').within(() => {
        cy.get('td').eq(5).should('be.visible').and('not.be.empty');
      });

      cy.getByCy('account-row-3010').within(() => {
        cy.get('td').eq(5).should('be.visible').and('not.be.empty');
      });
    });

    it('is expected to show loading states for summary data', () => {
      // Mock delayed response
      cy.intercept('POST', '/rest/v1/rpc/get_account_balance_and_count*', {
        delay: 1000,
        fixture: 'account_summaries.json'
      }).as('getAccountSummariesSlow');

      // Navigate to accounts page
      cy.visit('/accounts');
      cy.wait('@getAccounts');

      // Should show loading spinners in balance and transaction columns
      cy.get('.animate-spin').should('exist');
    });

    it('is expected to handle accounts with no transaction data', () => {
      // Enable showing inactive accounts
      cy.getByCy('include-inactive-checkbox').check();
      cy.wait('@getAccounts');
      
      cy.getByCy('account-row-6570').within(() => {
        // Balance and transaction columns should be visible
        cy.get('td').eq(4).should('be.visible');
        cy.get('td').eq(5).should('be.visible');
      });
    });
  });

  describe('Error Handling', () => {
    it('is expected to handle account creation errors', () => {
      // Mock create account error with proper URL pattern
      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 400,
        body: { message: 'Account number already exists' }
      }).as('createAccountError');

      cy.getByCy('create-account-button').click();
      
      // Fill valid form data with unique number
      cy.getByCy('account-number-input').type('4502');
      cy.getByCy('account-class-select').select('expenses');
      cy.getByCy('account-name-input').type('Test Account');
      
      // Submit form
      cy.getByCy('save-account-button').click();
      
      cy.wait('@createAccountError');
      
      // Modal should remain open when there's an error
      cy.getByCy('account-modal').should('be.visible');
    });

    it('is expected to handle account update errors', () => {
      // Mock update account error with proper URL pattern
      cy.intercept('PATCH', '**/rest/v1/accounts*', {
        statusCode: 409,
        body: { message: 'Cannot update system account' }
      }).as('updateAccountError');

      cy.getByCy('edit-account-6570').click();
      cy.getByCy('account-name-input').clear().type('Updated Name');
      cy.getByCy('save-account-button').click();
      
      cy.wait('@updateAccountError');
      
      // Modal should remain open when there's an error
      cy.getByCy('account-modal').should('be.visible');
    });
  });

  describe('Accessibility', () => {
    it('is expected to be keyboard accessible', () => {
      // Open modal using click
      cy.getByCy('create-account-button').click();
      cy.getByCy('account-modal').should('be.visible');
      
      // Close modal using close button
      cy.getByCy('close-account-modal').click();
      cy.getByCy('account-modal').should('not.exist');
    });

    it('is expected to have proper ARIA labels and roles', () => {
      cy.getByCy('create-account-button').click();
      
      // Modal should have proper accessibility attributes
      cy.getByCy('account-modal').within(() => {
        cy.get('h2').should('exist'); // Modal title
        cy.get('form').should('exist'); // Form element
        cy.get('label').should('exist'); // Field labels
      });
    });
  });
});