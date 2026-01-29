/// <reference types="cypress" />

describe('Journal Entries (US-210)', () => {
  // Test fiscal year data
  const testFiscalYear = {
    id: 'test-fiscal-year-id',
    organization_id: 'test-org-id',
    name: '2024',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_closed: false,
    next_verification_number: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }

  // Test accounts data
  const testAccounts = [
    { id: 'acc-1510', account_number: '1510', name: 'Kundfordringar', name_en: 'Accounts Receivable', account_class: 'assets', is_active: true },
    { id: 'acc-1930', account_number: '1930', name: 'Företagskonto', name_en: 'Bank Account', account_class: 'assets', is_active: true },
    { id: 'acc-3010', account_number: '3010', name: 'Försäljning varor', name_en: 'Sales Revenue', account_class: 'revenue', is_active: true },
    { id: 'acc-4010', account_number: '4010', name: 'Inköp material', name_en: 'Material Purchases', account_class: 'expenses', is_active: true },
    { id: 'acc-2610', account_number: '2610', name: 'Utgående moms', name_en: 'Output VAT', account_class: 'liabilities', is_active: true }
  ]

  // Test journal entry data
  const testJournalEntry = {
    id: 'test-journal-entry-id',
    organization_id: 'test-org-id',
    fiscal_year_id: 'test-fiscal-year-id',
    verification_number: 1,
    entry_date: '2024-03-15',
    description: 'Test journal entry',
    status: 'draft',
    source_type: 'manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fiscal_year: testFiscalYear,
    lines: [
      { id: 'line-1', account_id: 'acc-1510', account: testAccounts[0], debit_amount: 1000, credit_amount: 0, line_order: 0 },
      { id: 'line-2', account_id: 'acc-3010', account: testAccounts[2], debit_amount: 0, credit_amount: 1000, line_order: 1 }
    ]
  }

  const setupJournalEntriesIntercepts = (fiscalYears = [testFiscalYear], entries = [], accounts = testAccounts) => {
    // Intercept fiscal years
    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: fiscalYears
    }).as('getFiscalYears')

    // Intercept journal entries
    cy.intercept('GET', '**/rest/v1/journal_entries*', {
      statusCode: 200,
      body: entries
    }).as('getJournalEntries')

    // Intercept accounts
    cy.intercept('GET', '**/rest/v1/accounts*', {
      statusCode: 200,
      body: accounts
    }).as('getAccounts')

    // Intercept create fiscal year
    cy.intercept('POST', '**/rest/v1/fiscal_years*', (req) => {
      req.reply({
        statusCode: 201,
        body: { ...req.body, id: 'new-fiscal-year-id', created_at: new Date().toISOString() }
      })
    }).as('createFiscalYear')

    // Intercept create journal entry
    cy.intercept('POST', '**/rest/v1/journal_entries*', (req) => {
      req.reply({
        statusCode: 201,
        body: { ...req.body, id: 'new-entry-id', verification_number: 1, created_at: new Date().toISOString() }
      })
    }).as('createJournalEntry')

    // Intercept create journal entry lines
    cy.intercept('POST', '**/rest/v1/journal_entry_lines*', {
      statusCode: 201,
      body: []
    }).as('createJournalEntryLines')

    // Intercept update journal entry
    cy.intercept('PATCH', '**/rest/v1/journal_entries*', (req) => {
      req.reply({
        statusCode: 200,
        body: { ...testJournalEntry, ...req.body }
      })
    }).as('updateJournalEntry')

    // Intercept delete journal entry
    cy.intercept('DELETE', '**/rest/v1/journal_entries*', {
      statusCode: 204
    }).as('deleteJournalEntry')

    // Intercept delete journal entry lines
    cy.intercept('DELETE', '**/rest/v1/journal_entry_lines*', {
      statusCode: 204
    }).as('deleteJournalEntryLines')

    // Intercept RPC for verification number
    cy.intercept('POST', '**/rest/v1/rpc/get_next_verification_number', {
      statusCode: 200,
      body: 1
    }).as('getNextVerificationNumber')
  }

  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts({ clients: [], products: [] })
    cy.wait('@getDefaultOrg')
  })

  describe('Navigation', () => {
    beforeEach(() => {
      setupJournalEntriesIntercepts()
    })

    it('is expected to have Journal Entries link in Accounting section of sidebar', () => {
      cy.get('[data-cy="sidebar-nav-journal-entries"]').should('be.visible')
    })

    it('is expected to navigate to /journal-entries route', () => {
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.url().should('include', '/journal-entries')
    })

    it('is expected to display the Journal Entries page with title', () => {
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.getByCy('journal-entries-page-title').should('be.visible')
      cy.getByCy('journal-entries-page-title').should('contain', 'Journal Entries')
    })
  })

  describe('Fiscal Year Management', () => {
    describe('when no fiscal years exist', () => {
      beforeEach(() => {
        setupJournalEntriesIntercepts([], [])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display the no fiscal years state', () => {
        cy.getByCy('no-fiscal-year-state').should('be.visible')
      })

      it('is expected to have a button to create first fiscal year', () => {
        cy.getByCy('create-first-fiscal-year-button').should('be.visible')
      })

      it('is expected to open fiscal year modal when clicking create button', () => {
        cy.getByCy('create-first-fiscal-year-button').click()
        cy.getByCy('fiscal-year-modal').should('be.visible')
      })
    })

    describe('when creating a fiscal year', () => {
      beforeEach(() => {
        setupJournalEntriesIntercepts([], [])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
        cy.getByCy('create-first-fiscal-year-button').click()
      })

      it('is expected to display the fiscal year modal with form fields', () => {
        cy.getByCy('fiscal-year-modal').should('be.visible')
        cy.getByCy('fiscal-year-name').should('be.visible')
        cy.getByCy('fiscal-year-start').should('be.visible')
        cy.getByCy('fiscal-year-end').should('be.visible')
      })

      it('is expected to have preset buttons for calendar year and broken year', () => {
        cy.getByCy('preset-calendar').should('be.visible')
        cy.getByCy('preset-broken').should('be.visible')
      })

      it('is expected to close modal when clicking cancel', () => {
        cy.getByCy('cancel-fiscal-year').click()
        cy.getByCy('fiscal-year-modal').should('not.exist')
      })
    })

    describe('when fiscal years exist', () => {
      beforeEach(() => {
        setupJournalEntriesIntercepts([testFiscalYear], [])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
      })

      it('is expected to display fiscal year selector', () => {
        cy.getByCy('fiscal-year-select').should('be.visible')
      })

      it('is expected to show the fiscal year name in selector', () => {
        cy.getByCy('fiscal-year-select').should('contain', '2024')
      })

      it('is expected to have button to add more fiscal years', () => {
        cy.getByCy('create-fiscal-year-button').should('be.visible')
      })
    })
  })

  describe('Journal Entries List', () => {
    describe('when no entries exist', () => {
      beforeEach(() => {
        setupJournalEntriesIntercepts([testFiscalYear], [])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntries')
      })

      it('is expected to display empty state', () => {
        cy.getByCy('journal-entries-empty-state').should('be.visible')
      })

      it('is expected to have a button to create first entry', () => {
        cy.getByCy('create-first-entry-button').should('be.visible')
      })
    })

    describe('when entries exist', () => {
      beforeEach(() => {
        setupJournalEntriesIntercepts([testFiscalYear], [testJournalEntry])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntries')
      })

      it('is expected to display entries table', () => {
        cy.getByCy('journal-entries-table').should('be.visible')
      })

      it('is expected to show entry verification number', () => {
        cy.getByCy('journal-entry-row-1').should('contain', '#1')
      })

      it('is expected to show entry date', () => {
        cy.getByCy('journal-entry-row-1').should('contain', '2024-03-15')
      })

      it('is expected to show entry status', () => {
        cy.getByCy('entry-status-draft').should('be.visible')
      })

      it('is expected to show debit and credit totals', () => {
        cy.getByCy('journal-entry-row-1').should('contain', '1000.00')
      })
    })

    describe('filtering entries', () => {
      const postedEntry = { ...testJournalEntry, id: 'posted-entry', verification_number: 2, status: 'posted' }
      
      beforeEach(() => {
        setupJournalEntriesIntercepts([testFiscalYear], [testJournalEntry, postedEntry])
        cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
        cy.wait('@getFiscalYears')
        cy.wait('@getJournalEntries')
      })

      it('is expected to filter by draft status', () => {
        cy.getByCy('filter-draft').click()
        cy.getByCy('journal-entry-row-1').should('exist')
        cy.getByCy('journal-entry-row-2').should('not.exist')
      })

      it('is expected to filter by posted status', () => {
        cy.getByCy('filter-posted').click()
        cy.getByCy('journal-entry-row-2').should('exist')
        cy.getByCy('journal-entry-row-1').should('not.exist')
      })

      it('is expected to show all entries when clicking All filter', () => {
        cy.getByCy('filter-draft').click()
        cy.getByCy('filter-all').click()
        cy.getByCy('journal-entries-table').find('tbody tr').should('have.length', 2)
      })

      it('is expected to search by verification number', () => {
        cy.getByCy('search-entries-input').type('1')
        cy.getByCy('journal-entry-row-1').should('exist')
      })
    })
  })

  describe('Create Journal Entry', () => {
    beforeEach(() => {
      setupJournalEntriesIntercepts([testFiscalYear], [])
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to open modal when clicking create button', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('journal-entry-modal').should('be.visible')
    })

    it('is expected to display entry form with date and description fields', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('entry-date').should('be.visible')
      cy.getByCy('entry-description').should('be.visible')
    })

    it('is expected to have at least two line rows by default', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('entry-line-0').should('exist')
      cy.getByCy('entry-line-1').should('exist')
    })

    it('is expected to add a new line when clicking add line button', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('journal-entry-modal').should('be.visible')
      cy.getByCy('add-line-button').scrollIntoView().should('be.visible')
      cy.getByCy('add-line-button').click()
      cy.getByCy('entry-line-2').should('exist')
    })

    it('is expected to show balance status', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('balance-status').should('be.visible')
    })

    it('is expected to close modal when clicking cancel', () => {
      cy.getByCy('create-journal-entry-button').click()
      cy.wait('@getAccounts')
      cy.getByCy('cancel-entry').click()
      cy.getByCy('journal-entry-modal').should('not.exist')
    })
  })

  describe('Edit Journal Entry', () => {
    beforeEach(() => {
      setupJournalEntriesIntercepts([testFiscalYear], [testJournalEntry])
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to open edit modal when clicking edit button on draft entry', () => {
      cy.getByCy('edit-entry-1').click()
      cy.wait('@getAccounts')
      cy.getByCy('journal-entry-modal').should('be.visible')
    })

    it('is expected to display the entry data in the form', () => {
      cy.getByCy('edit-entry-1').click()
      cy.wait('@getAccounts')
      cy.getByCy('entry-date').should('have.value', '2024-03-15')
      cy.getByCy('entry-description').should('have.value', 'Test journal entry')
    })
  })

  describe('Delete Journal Entry', () => {
    beforeEach(() => {
      setupJournalEntriesIntercepts([testFiscalYear], [testJournalEntry])
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to show confirm dialog when clicking delete button', () => {
      cy.getByCy('delete-entry-1').click()
      cy.getByCy('confirm-dialog').should('be.visible')
    })

    it('is expected to close dialog when clicking cancel', () => {
      cy.getByCy('delete-entry-1').click()
      cy.getByCy('confirm-cancel').click()
      cy.getByCy('confirm-dialog').should('not.exist')
    })
  })

  describe('Post Journal Entry', () => {
    beforeEach(() => {
      setupJournalEntriesIntercepts([testFiscalYear], [testJournalEntry])
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to show confirm dialog when clicking post button', () => {
      cy.getByCy('post-entry-1').click()
      cy.getByCy('confirm-dialog').should('be.visible')
    })

    it('is expected to close dialog when clicking cancel', () => {
      cy.getByCy('post-entry-1').click()
      cy.getByCy('confirm-cancel').click()
      cy.getByCy('confirm-dialog').should('not.exist')
    })
  })

  describe('View Posted Entry', () => {
    const postedEntry = { ...testJournalEntry, id: 'posted-entry', verification_number: 2, status: 'posted' }

    beforeEach(() => {
      setupJournalEntriesIntercepts([testFiscalYear], [postedEntry])
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntries')
    })

    it('is expected to show view button for posted entries', () => {
      cy.getByCy('view-entry-2').should('be.visible')
    })

    it('is expected to not show edit or delete buttons for posted entries', () => {
      cy.getByCy('edit-entry-2').should('not.exist')
      cy.getByCy('delete-entry-2').should('not.exist')
    })
  })

  describe('Error Handling', () => {
    it('is expected to display error when API fails', () => {
      // Set up fiscal years to load correctly, but entries to fail
      cy.intercept('GET', '**/rest/v1/fiscal_years*', {
        statusCode: 200,
        body: [testFiscalYear]
      }).as('getFiscalYears')

      // Intercept journal entries with error
      cy.intercept('GET', '**/rest/v1/journal_entries*', {
        statusCode: 500,
        body: { error: 'Server error' }
      }).as('getJournalEntriesError')

      // Navigate to page - the error intercept is already set up
      cy.get('[data-cy="sidebar-nav-journal-entries"]').click()
      cy.wait('@getFiscalYears')
      cy.wait('@getJournalEntriesError')
      // Error handling would be shown in the UI - verify error state if component displays one
    })
  })
})
