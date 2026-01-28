/// <reference types="cypress" />

describe('Chart of Accounts (Kontoplan)', () => {
  // Sample BAS 2024 accounts for testing
  const sampleAccounts = [
    {
      id: 'acc-1510',
      account_number: '1510',
      name: 'Kundfordringar',
      name_en: 'Accounts Receivable',
      account_class: 'assets',
      account_type: 'detail',
      is_system: true,
      is_active: true,
      organization_id: 'test-org-id'
    },
    {
      id: 'acc-1930',
      account_number: '1930',
      name: 'Företagskonto/checkkonto/affärskonto',
      name_en: 'Business Account',
      account_class: 'assets',
      account_type: 'detail',
      is_system: true,
      is_active: true,
      organization_id: 'test-org-id'
    },
    {
      id: 'acc-2440',
      account_number: '2440',
      name: 'Leverantörsskulder',
      name_en: 'Accounts Payable',
      account_class: 'liabilities',
      account_type: 'detail',
      is_system: true,
      is_active: true,
      organization_id: 'test-org-id'
    },
    {
      id: 'acc-3010',
      account_number: '3010',
      name: 'Försäljning varor 25% moms',
      name_en: 'Sales Goods 25% VAT',
      account_class: 'revenue',
      account_type: 'detail',
      is_system: true,
      is_active: true,
      organization_id: 'test-org-id',
      default_vat_rate: 25
    },
    {
      id: 'acc-4010',
      account_number: '4010',
      name: 'Inköp material och varor',
      name_en: 'Materials and Goods Purchases',
      account_class: 'expenses',
      account_type: 'detail',
      is_system: true,
      is_active: true,
      organization_id: 'test-org-id'
    },
    {
      id: 'acc-5010',
      account_number: '5010',
      name: 'Lokalhyra',
      name_en: 'Rent',
      account_class: 'expenses',
      account_type: 'detail',
      is_system: false,
      is_active: true,
      organization_id: 'test-org-id'
    },
    {
      id: 'acc-inactive',
      account_number: '9999',
      name: 'Inaktivt konto',
      name_en: 'Inactive Account',
      account_class: 'expenses',
      account_type: 'detail',
      is_system: false,
      is_active: false,
      organization_id: 'test-org-id'
    }
  ]

  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts({
      accounts: sampleAccounts.filter(a => a.is_active)
    })
  })

  describe('Happy Path - Viewing Accounts', () => {
    beforeEach(() => {
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')
    })

    it('is expected to display the accounts page with title', () => {
      cy.getByCy('accounts-page-title').should('be.visible')
      cy.getByCy('accounts-page-title').should('contain', 'Chart of Accounts')
    })

    it('is expected to display the accounts table with headers', () => {
      cy.getByCy('accounts-table').should('be.visible')
      cy.getByCy('accounts-table').contains('th', 'Account')
      cy.getByCy('accounts-table').contains('th', 'Name')
      cy.getByCy('accounts-table').contains('th', 'Class')
      cy.getByCy('accounts-table').contains('th', 'Type')
      cy.getByCy('accounts-table').contains('th', 'Status')
    })

    it('is expected to display active accounts in the list', () => {
      cy.getByCy('accounts-list').should('be.visible')
      cy.getByCy('account-row-1510').should('be.visible')
      cy.getByCy('account-row-1510').within(() => {
        cy.getByCy('account-number').should('contain', '1510')
        cy.getByCy('account-name').should('contain', 'Accounts Receivable')
        cy.getByCy('account-class').should('contain', 'Assets')
        cy.getByCy('account-status-active').should('be.visible')
      })
    })

    it('is expected to display account class badges with correct colors', () => {
      cy.getByCy('account-row-1510').find('[data-cy="account-class"]').should('have.class', 'bg-blue-100')
      cy.getByCy('account-row-2440').find('[data-cy="account-class"]').should('have.class', 'bg-red-100')
      cy.getByCy('account-row-3010').find('[data-cy="account-class"]').should('have.class', 'bg-green-100')
    })

    it('is expected to show system badge for system accounts', () => {
      cy.getByCy('account-row-1510').should('contain', 'System')
    })

    it('is expected to display the account count in footer', () => {
      cy.getByCy('accounts-list').should('contain', 'Showing')
    })
  })

  describe('Happy Path - Search and Filter', () => {
    beforeEach(() => {
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')
    })

    it('is expected to filter accounts by search term (account number)', () => {
      cy.getByCy('search-accounts-input').type('1510')
      cy.getByCy('account-row-1510').should('be.visible')
      cy.getByCy('account-row-2440').should('not.exist')
    })

    it('is expected to filter accounts by search term (name)', () => {
      cy.getByCy('search-accounts-input').type('Receivable')
      cy.getByCy('account-row-1510').should('be.visible')
      cy.getByCy('account-row-2440').should('not.exist')
    })

    it('is expected to filter accounts by class', () => {
      cy.getByCy('filter-assets').click()
      cy.getByCy('account-row-1510').should('be.visible')
      cy.getByCy('account-row-1930').should('be.visible')
      cy.getByCy('account-row-2440').should('not.exist')
      cy.getByCy('account-row-3010').should('not.exist')
    })

    it('is expected to show all accounts when clicking All filter', () => {
      cy.getByCy('filter-expenses').click()
      cy.getByCy('account-row-1510').should('not.exist')
      
      cy.getByCy('filter-all').click()
      cy.getByCy('account-row-1510').should('be.visible')
      cy.getByCy('account-row-2440').should('be.visible')
    })

    it('is expected to combine search and class filter', () => {
      cy.getByCy('filter-expenses').click()
      cy.getByCy('search-accounts-input').type('Rent')
      cy.getByCy('account-row-5010').should('be.visible')
      cy.getByCy('account-row-4010').should('not.exist')
    })

    it('is expected to show no results message when no accounts match', () => {
      cy.getByCy('search-accounts-input').type('NONEXISTENT')
      cy.getByCy('accounts-no-results').should('be.visible')
      cy.getByCy('accounts-no-results').should('contain', 'No matching accounts')
    })
  })

  describe('Happy Path - Include Inactive Accounts', () => {
    it('is expected to show inactive accounts when checkbox is checked', () => {
      // Set up intercepts - first for active only, then for all
      cy.setupCommonIntercepts({
        accounts: sampleAccounts.filter(a => a.is_active)
      })
      
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')

      // Initially inactive account should not be visible
      cy.getByCy('account-row-9999').should('not.exist')

      // Re-intercept to return all accounts including inactive
      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: sampleAccounts
      }).as('getAccountsWithInactive')

      // Check the include inactive checkbox
      cy.getByCy('include-inactive-checkbox').check()
      cy.wait('@getAccountsWithInactive')

      // Now inactive account should be visible with reduced opacity
      cy.getByCy('account-row-9999').should('be.visible')
      cy.getByCy('account-row-9999').should('have.class', 'opacity-50')
      cy.getByCy('account-row-9999').find('[data-cy="account-status-inactive"]').should('be.visible')
    })
  })

  describe('Happy Path - Deactivate Account', () => {
    beforeEach(() => {
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')
    })

    it('is expected to show deactivate button for non-system accounts', () => {
      cy.getByCy('toggle-account-5010').should('be.visible')
      cy.getByCy('toggle-account-5010').should('contain', 'Deactivate')
    })

    it('is expected to not show deactivate button for system accounts', () => {
      cy.getByCy('toggle-account-1510').should('not.exist')
    })

    it('is expected to open confirmation modal when clicking deactivate', () => {
      cy.getByCy('toggle-account-5010').click()
      cy.getByCy('action-confirm-modal').should('be.visible')
      cy.getByCy('action-confirm-modal').should('contain', 'Deactivate Account')
      cy.getByCy('action-confirm-modal').should('contain', '5010')
      cy.getByCy('action-confirm-modal').should('contain', 'Rent')
    })

    it('is expected to close confirmation modal when clicking cancel', () => {
      cy.getByCy('toggle-account-5010').click()
      cy.getByCy('action-confirm-modal').should('be.visible')
      cy.getByCy('cancel-action-button').click()
      cy.getByCy('action-confirm-modal').should('not.exist')
    })

    it('is expected to deactivate account when confirmed', () => {
      cy.intercept('PATCH', '**/rest/v1/accounts*', (req) => {
        expect(req.body).to.deep.equal({ is_active: false })
        req.reply({
          statusCode: 200,
          body: { ...sampleAccounts[5], is_active: false }
        })
      }).as('deactivateAccount')

      cy.getByCy('toggle-account-5010').click()
      cy.getByCy('confirm-action-button').click()
      cy.wait('@deactivateAccount')
      cy.getByCy('action-confirm-modal').should('not.exist')
    })
  })

  describe('Happy Path - Activate Account', () => {
    it('is expected to show activate button for inactive accounts', () => {
      // Set up intercepts for active-only first
      cy.setupCommonIntercepts({
        accounts: sampleAccounts.filter(a => a.is_active)
      })
      
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')
      
      // Return all accounts including inactive when checkbox checked
      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: sampleAccounts
      }).as('getAccountsWithInactive')

      cy.getByCy('include-inactive-checkbox').check()
      cy.wait('@getAccountsWithInactive')

      cy.getByCy('toggle-account-9999').should('be.visible')
      cy.getByCy('toggle-account-9999').should('contain', 'Activate')
    })

    it('is expected to activate account when confirmed', () => {
      // Set up intercepts for active-only first
      cy.setupCommonIntercepts({
        accounts: sampleAccounts.filter(a => a.is_active)
      })
      
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')
      
      // Return all accounts including inactive when checkbox checked
      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: sampleAccounts
      }).as('getAccountsWithInactive')

      cy.getByCy('include-inactive-checkbox').check()
      cy.wait('@getAccountsWithInactive')

      cy.intercept('PATCH', '**/rest/v1/accounts*', (req) => {
        expect(req.body).to.deep.equal({ is_active: true })
        req.reply({
          statusCode: 200,
          body: { ...sampleAccounts[6], is_active: true }
        })
      }).as('activateAccount')

      cy.getByCy('toggle-account-9999').click()
      cy.getByCy('action-confirm-modal').should('contain', 'Activate Account')
      cy.getByCy('confirm-action-button').click()
      cy.wait('@activateAccount')
      cy.getByCy('action-confirm-modal').should('not.exist')
    })
  })

  describe('Happy Path - Seed BAS Accounts (Empty State)', () => {
    beforeEach(() => {
      cy.setupCommonIntercepts({
        accounts: []
      })
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')
    })

    it('is expected to show empty state when no accounts exist', () => {
      cy.getByCy('accounts-empty-state').should('be.visible')
      cy.getByCy('accounts-empty-state').should('contain', 'No accounts yet')
    })

    it('is expected to show seed BAS accounts button in empty state', () => {
      cy.getByCy('seed-accounts-button-empty').should('be.visible')
      cy.getByCy('seed-accounts-button-empty').should('contain', 'Initialize BAS 2024 Accounts')
    })

    it('is expected to seed BAS accounts when button clicked', () => {
      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 201,
        body: sampleAccounts.filter(a => a.is_system)
      }).as('seedAccounts')

      // After seeding, refetch returns the new accounts
      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 200,
        body: sampleAccounts.filter(a => a.is_active)
      }).as('getAccountsAfterSeed')

      cy.getByCy('seed-accounts-button-empty').click()
      cy.wait('@seedAccounts')
    })
  })

  describe('Sad Path - Error Handling', () => {
    it('is expected to display error message when fetch fails', () => {
      cy.intercept('GET', '**/rest/v1/accounts*', {
        statusCode: 500,
        body: { message: 'Internal server error' }
      }).as('getAccountsError')

      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccountsError')

      cy.getByCy('accounts-error').should('be.visible')
    })

    it('is expected to display error when seeding fails', () => {
      cy.setupCommonIntercepts({
        accounts: []
      })

      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.wait('@getAccounts')

      cy.intercept('POST', '**/rest/v1/accounts*', {
        statusCode: 500,
        body: { message: 'Failed to seed accounts' }
      }).as('seedAccountsError')

      cy.getByCy('seed-accounts-button-empty').click()
      cy.wait('@seedAccountsError')
      cy.getByCy('accounts-error').should('be.visible')
    })
  })

  describe('Navigation', () => {
    it('is expected to have Accounts link in Accounting section of sidebar', () => {
      cy.getByCy('sidebar-nav').contains('Accounting').should('be.visible')
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').should('be.visible')
    })

    it('is expected to navigate to /accounts route', () => {
      cy.getByCy('sidebar-nav').contains('Accounting').click()
      cy.getByCy('sidebar-nav').contains('Chart of Accounts').click()
      cy.url().should('include', '/accounts')
    })
  })
})
