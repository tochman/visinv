/// <reference types="cypress" />

describe('General Ledger (US-220)', () => {
  // Test fiscal year data
  const testFiscalYear = {
    id: 'test-fiscal-year-id',
    organization_id: 'test-org-id',
    name: '2024',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    is_closed: false,
    next_verification_number: 5,
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

  // Test ledger data (journal entry lines with journal entry info)
  const testLedgerLines = [
    {
      id: 'line-1',
      account_id: 'acc-1510',
      debit_amount: 12500,
      credit_amount: 0,
      description: 'Invoice INV-001',
      journal_entry: {
        id: 'entry-1',
        organization_id: 'test-org-id',
        fiscal_year_id: 'test-fiscal-year-id',
        verification_number: 1,
        entry_date: '2024-01-15',
        description: 'Sale to Customer A',
        status: 'posted'
      }
    },
    {
      id: 'line-2',
      account_id: 'acc-1510',
      debit_amount: 8750,
      credit_amount: 0,
      description: 'Invoice INV-002',
      journal_entry: {
        id: 'entry-2',
        organization_id: 'test-org-id',
        fiscal_year_id: 'test-fiscal-year-id',
        verification_number: 2,
        entry_date: '2024-02-01',
        description: 'Sale to Customer B',
        status: 'posted'
      }
    },
    {
      id: 'line-3',
      account_id: 'acc-1510',
      debit_amount: 0,
      credit_amount: 12500,
      description: 'Payment received',
      journal_entry: {
        id: 'entry-3',
        organization_id: 'test-org-id',
        fiscal_year_id: 'test-fiscal-year-id',
        verification_number: 3,
        entry_date: '2024-02-15',
        description: 'Payment from Customer A',
        status: 'posted'
      }
    },
    {
      id: 'line-4',
      account_id: 'acc-1510',
      debit_amount: 5000,
      credit_amount: 0,
      description: 'Invoice INV-003',
      journal_entry: {
        id: 'entry-4',
        organization_id: 'test-org-id',
        fiscal_year_id: 'test-fiscal-year-id',
        verification_number: 4,
        entry_date: '2024-03-10',
        description: 'Sale to Customer C',
        status: 'posted'
      }
    }
  ]

  const setupGeneralLedgerIntercepts = (accounts = testAccounts, fiscalYears = [testFiscalYear], ledgerLines = testLedgerLines) => {
    // Intercept accounts
    cy.intercept('GET', '**/rest/v1/accounts*', {
      statusCode: 200,
      body: accounts
    }).as('getAccounts')

    // Intercept fiscal years
    cy.intercept('GET', '**/rest/v1/fiscal_years*', {
      statusCode: 200,
      body: fiscalYears
    }).as('getFiscalYears')

    // Intercept ledger data (journal_entry_lines with journal_entry join)
    cy.intercept('GET', '**/rest/v1/journal_entry_lines*', (req) => {
      // Check if it's a ledger query (has account_id filter)
      if (req.url.includes('account_id=eq.')) {
        // Extract account_id from URL
        const accountIdMatch = req.url.match(/account_id=eq\.([^&]+)/)
        const accountId = accountIdMatch ? accountIdMatch[1] : null

        // Decode URL for easier pattern matching
        const decodedUrl = decodeURIComponent(req.url)
        
        // Check if this is an opening balance query (has lt filter for date)
        // The format is journal_entry.entry_date=lt.YYYY-MM-DD
        const isOpeningBalanceQuery = decodedUrl.includes('entry_date=lt.')
        
        if (isOpeningBalanceQuery) {
          // Return empty array for opening balance - no transactions before the period
          req.reply({
            statusCode: 200,
            body: []
          })
        } else {
          // Filter lines by account_id for ledger data
          const filteredLines = ledgerLines.filter(l => l.account_id === accountId)

          req.reply({
            statusCode: 200,
            body: filteredLines
          })
        }
      } else {
        req.reply({
          statusCode: 200,
          body: []
        })
      }
    }).as('getLedgerData')

    // Intercept journal entries for drill-down
    cy.intercept('GET', '**/rest/v1/journal_entries*', {
      statusCode: 200,
      body: []
    }).as('getJournalEntries')
  }

  beforeEach(() => {
    cy.login('admin')
    cy.setupCommonIntercepts({ clients: [], products: [] })
    cy.wait('@getDefaultOrg')
  })

  describe('Navigation', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
    })

    it('is expected to have General Ledger link in Accounting section of sidebar', () => {
      cy.get('[data-cy="sidebar-nav-general-ledger"]').should('be.visible')
    })

    it('is expected to navigate to /general-ledger route', () => {
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.url().should('include', '/general-ledger')
    })

    it('is expected to display the General Ledger page with title', () => {
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
      cy.getByCy('general-ledger-page').should('be.visible')
      cy.contains('General Ledger').should('be.visible')
    })
  })

  describe('Account Selection', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
    })

    it('is expected to show no account selected state initially', () => {
      cy.contains('No Account Selected').should('be.visible')
      cy.contains('Search and select an account to view its ledger').should('be.visible')
    })

    it('is expected to show account search input', () => {
      cy.getByCy('account-search').should('be.visible')
    })

    it('is expected to show account dropdown when focusing search', () => {
      cy.getByCy('account-search').click()
      cy.getByCy('account-dropdown').should('be.visible')
    })

    it('is expected to filter accounts when typing in search', () => {
      cy.getByCy('account-search').type('1510')
      cy.getByCy('account-dropdown').should('be.visible')
      cy.getByCy('account-option-1510').should('be.visible')
      cy.getByCy('account-dropdown').find('button').should('have.length', 1)
    })

    it('is expected to select account when clicking dropdown option', () => {
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1510').click()
      cy.wait('@getLedgerData')
      cy.getByCy('selected-account-name').should('contain', '1510')
      cy.getByCy('selected-account-name').should('contain', 'Accounts Receivable')
    })
  })

  describe('Ledger Display', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
      // Select account 1510
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1510').click()
      cy.wait('@getLedgerData')
    })

    it('is expected to display ledger table with headers', () => {
      cy.getByCy('ledger-table').should('be.visible')
      cy.contains('th', 'Date').should('be.visible')
      cy.contains('th', 'Ver. No.').should('be.visible')
      cy.contains('th', 'Description').should('be.visible')
      cy.contains('th', 'Debit').should('be.visible')
      cy.contains('th', 'Credit').should('be.visible')
      cy.contains('th', 'Balance').should('be.visible')
    })

    it('is expected to display ledger transactions', () => {
      cy.getByCy('ledger-row-0').should('be.visible')
      cy.getByCy('ledger-row-1').should('be.visible')
      cy.getByCy('ledger-row-2').should('be.visible')
      cy.getByCy('ledger-row-3').should('be.visible')
    })

    it('is expected to show verification numbers for each transaction', () => {
      cy.getByCy('ledger-row-0').find('[data-cy="verification-number"]').should('contain', '1')
      cy.getByCy('ledger-row-1').find('[data-cy="verification-number"]').should('contain', '2')
      cy.getByCy('ledger-row-2').find('[data-cy="verification-number"]').should('contain', '3')
    })

    it('is expected to calculate running balance correctly', () => {
      // First row: 12500 debit, balance = 12500
      cy.getByCy('ledger-row-0').find('[data-cy="running-balance"]').invoke('text').should('match', /12[,\s]?500/)
      // Second row: +8750 debit, balance = 21250
      cy.getByCy('ledger-row-1').find('[data-cy="running-balance"]').invoke('text').should('match', /21[,\s]?250/)
      // Third row: -12500 credit, balance = 8750
      cy.getByCy('ledger-row-2').find('[data-cy="running-balance"]').invoke('text').should('match', /8[,\s]?750/)
      // Fourth row: +5000 debit, balance = 13750
      cy.getByCy('ledger-row-3').find('[data-cy="running-balance"]').invoke('text').should('match', /13[,\s]?750/)
    })

    it('is expected to display totals row', () => {
      cy.getByCy('totals-row').should('be.visible')
      cy.getByCy('total-debit').invoke('text').should('match', /26[,\s]?250/) // 12500 + 8750 + 5000
      cy.getByCy('total-credit').invoke('text').should('match', /12[,\s]?500/)
      cy.getByCy('final-balance').invoke('text').should('match', /13[,\s]?750/)
    })

    it('is expected to display closing balance in header', () => {
      cy.getByCy('closing-balance').invoke('text').should('match', /13[,\s]?750/)
    })
  })

  describe('Date Range Filter', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
    })

    it('is expected to show date range inputs', () => {
      cy.getByCy('start-date').should('be.visible')
      cy.getByCy('end-date').should('be.visible')
    })

    it('is expected to pre-fill dates from selected fiscal year', () => {
      cy.getByCy('start-date').should('have.value', '2024-01-01')
      cy.getByCy('end-date').should('have.value', '2024-12-31')
    })

    it('is expected to filter data when changing date range', () => {
      // Select an account first
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1510').click()
      cy.wait('@getLedgerData')

      // Change date range
      cy.getByCy('start-date').clear().type('2024-02-01')
      cy.wait('@getLedgerData')

      // Verify the API was called with new dates
      cy.get('@getLedgerData.all').should('have.length.at.least', 2)
    })
  })

  describe('Fiscal Year Filter', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
    })

    it('is expected to show fiscal year select', () => {
      cy.getByCy('fiscal-year-select').should('be.visible')
    })

    it('is expected to have All Periods option', () => {
      cy.getByCy('fiscal-year-select').find('option').first().should('contain', 'All Periods')
    })

    it('is expected to list available fiscal years', () => {
      cy.getByCy('fiscal-year-select').find('option').should('have.length', 2) // All Periods + 2024
      cy.getByCy('fiscal-year-select').should('contain', '2024')
    })
  })

  describe('Drill-down to Journal Entry', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
      // Select account 1510
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1510').click()
      cy.wait('@getLedgerData')
    })

    it('is expected to have clickable rows', () => {
      cy.getByCy('ledger-row-0').should('have.css', 'cursor', 'pointer')
    })

    it('is expected to navigate to journal entries page when clicking a row', () => {
      cy.getByCy('ledger-row-0').click()
      cy.url().should('include', '/journal-entries')
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      // Setup with no ledger data
      setupGeneralLedgerIntercepts(testAccounts, [testFiscalYear], [])
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
    })

    it('is expected to show empty message when account has no transactions', () => {
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1930').click() // Bank Account - no transactions
      cy.wait('@getLedgerData')
      cy.contains('No transactions found').should('be.visible')
    })
  })

  describe('Period Summary', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
      // Select account 1510
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1510').click()
      cy.wait('@getLedgerData')
    })

    it('is expected to display period summary card', () => {
      cy.contains('Period Summary').scrollIntoView().should('be.visible')
    })

    it('is expected to show transaction count', () => {
      cy.contains('4 transactions').scrollIntoView().should('be.visible')
    })

    it('is expected to show opening balance in summary', () => {
      cy.contains('Opening Balance').scrollIntoView().should('be.visible')
    })

    it('is expected to show period debits and credits', () => {
      cy.contains('Period Debits').scrollIntoView().should('be.visible')
      cy.contains('Period Credits').scrollIntoView().should('be.visible')
    })
  })

  describe('Multiple Accounts', () => {
    beforeEach(() => {
      setupGeneralLedgerIntercepts()
      cy.get('[data-cy="sidebar-nav-general-ledger"]').click()
      cy.wait('@getAccounts')
      cy.wait('@getFiscalYears')
    })

    it('is expected to clear ledger when selecting different account', () => {
      // Select first account
      cy.getByCy('account-search').click()
      cy.getByCy('account-option-1510').click()
      cy.wait('@getLedgerData')
      cy.getByCy('ledger-table').should('be.visible')

      // Clear and select different account
      cy.getByCy('account-search').clear().type('3010')
      cy.getByCy('account-option-3010').click()
      cy.wait('@getLedgerData')

      // Should show different account
      cy.getByCy('selected-account-name').should('contain', '3010')
      cy.getByCy('selected-account-name').should('contain', 'Sales Revenue')
    })
  })
})
